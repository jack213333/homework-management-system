import hashlib
import json
from pathlib import Path
import uuid
from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError, APIException
from common.errors import Conflict, TooLarge
from common.permissions import require_course_access
from common.audit import audit
from plagiarism.extraction import extract_file
from .models import Assignment, Submission, Attachment

ALLOWED = {"report": {".docx", ".pdf", ".txt"}, "code": {".py", ".java"}}


def create_submission(
    *, actor, assignment, request_id, comment, report_files, code_files
):
    require_course_access(actor, assignment.course)
    if actor.role != "student":
        raise PermissionDenied("只有学生可以提交自己的作业")
    files = [
        (kind, f)
        for kind, items in (("report", report_files), ("code", code_files))
        for f in items
    ]
    if len(files) > 20:
        raise TooLarge("一次最多提交 20 个附件")
    if sum(f.size for _, f in files) > 50 * 1024 * 1024:
        raise TooLarge("单次提交不能超过 50 MiB")
    if len(comment) > 5000:
        raise ValidationError("备注不能超过 5000 字")
    metadata = []
    for kind, file in files:
        name = file.name.replace("\\", "/").split("/")[-1]
        suffix = Path(name).suffix.lower()
        if len(name) > 240:
            raise ValidationError("文件名过长")
        if suffix not in ALLOWED[kind]:
            raise ValidationError("报告支持 DOCX/PDF/TXT，代码支持 PY/JAVA")
        if file.size > 20 * 1024 * 1024:
            raise TooLarge("单个附件不能超过 20 MiB")
        if file.size == 0:
            raise ValidationError("不能提交空文件")
        digest = hashlib.sha256()
        for chunk in file.chunks():
            digest.update(chunk)
        file.seek(0)
        metadata.append((kind, file, name, suffix, digest.hexdigest()))
    canonical = {
        "assignment": assignment.pk,
        "comment": comment,
        "files": sorted([(k, n, f.size, h) for k, f, n, s, h in metadata]),
    }
    fingerprint = hashlib.sha256(
        json.dumps(
            canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode()
    ).hexdigest()
    written = []
    try:
        with transaction.atomic():
            assignment = (
                Assignment.objects.select_for_update()
                .select_related("course")
                .get(pk=assignment.pk)
            )
            require_course_access(actor, assignment.course)
            previous = Submission.objects.filter(
                student=actor, request_id=request_id
            ).first()
            if previous:
                if previous.request_fingerprint != fingerprint:
                    raise Conflict("同一请求编号的内容已改变，请重新发起提交")
                return previous
            if assignment.status != "open" or assignment.course.status != "active":
                raise ValidationError("作业未开放或课程已归档，不能提交")
            if assignment.require_report and not report_files:
                raise ValidationError("请上传至少一份报告")
            if assignment.require_code and not code_files:
                raise ValidationError("请上传至少一份代码")
            late = timezone.now() > assignment.deadline
            if late and not assignment.allow_late:
                raise ValidationError("已过截止时间，本次作业不接受迟交")
            version = (
                Submission.objects.filter(
                    assignment=assignment, student=actor
                ).aggregate(value=Max("version"))["value"]
                or 0
            ) + 1
            submission = Submission.objects.create(
                assignment=assignment,
                student=actor,
                version=version,
                request_id=request_id,
                request_fingerprint=fingerprint,
                deadline_snapshot=assignment.deadline,
                is_late=late,
                comment=comment,
            )
            root = Path(settings.MEDIA_ROOT)
            root.mkdir(parents=True, exist_ok=True)
            for kind, file, name, suffix, digest in metadata:
                key = f"{uuid.uuid4().hex}{suffix}"
                path = root / key
                written.append(path)
                with path.open("xb") as dest:
                    for chunk in file.chunks():
                        dest.write(chunk)
                language = {".py": "python", ".java": "java"}.get(suffix)
                result = extract_file(path, kind, language)
                Attachment.objects.create(
                    submission=submission,
                    kind=kind,
                    original_name=name,
                    storage_key=key,
                    size_bytes=file.size,
                    sha256=digest,
                    language=language,
                    extraction_status=result.status,
                    extracted_text=result.text,
                    locations=result.locations,
                    extraction_note=result.note,
                )
            audit(actor, "submission.create", submission, version=version)
            return submission
    except Exception as exc:
        for path in written:
            path.unlink(missing_ok=True)
        if isinstance(exc, OSError):
            raise APIException("保存附件失败，本次提交未保存，请重试") from exc
        raise
