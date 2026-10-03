from dataclasses import asdict
from itertools import combinations
from django.db import transaction,IntegrityError
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from assignments.models import Assignment,Attachment
from assignments.grading import latest_submissions
from common.permissions import require_course_access
from common.errors import Conflict
from common.audit import audit
from .models import SimilarityRun,SimilarityPair
from .comparison import DEFAULT_PARAMETERS,prepare_file,compare_files

def is_stale(run):
    current=Assignment.objects.get(pk=run.assignment_id)
    ids=sorted(latest_submissions(current).values_list('id',flat=True))
    return ids!=run.submission_ids or current.template_revision!=run.template_revision

def interrupt_runs():
    return SimilarityRun.objects.filter(status='running').update(status='interrupted',finished_at=timezone.now(),error_message='本机服务重启，原检测已中断；请重新检测')

def run_similarity(*,actor,assignment):
    require_course_access(actor,assignment.course,write=True)
    try:
        with transaction.atomic():
            current=Assignment.objects.get(pk=assignment.pk)
            ids=sorted(latest_submissions(current).values_list('id',flat=True))
            files=list(Attachment.objects.filter(submission_id__in=ids).select_related('submission').order_by('id'))
            templates=list(current.templates.all())
            # Synchronous first version has an explicit size gate instead of tying up a large class indefinitely.
            if len(files)>160 or sum(len(f.extracted_text) for f in files)>4_000_000:
                raise ValidationError('单次检测最多 160 个附件、合计 400 万提取字符；请减少文件范围后重试')
            run=SimilarityRun.objects.create(assignment=current,requested_by=actor,status='running',submission_ids=ids,template_revision=current.template_revision,parameters=DEFAULT_PARAMETERS)
    except IntegrityError:
        raise Conflict('这份作业已有检测正在运行，请等待完成')
    try:
        prepared={f.id:prepare_file(f,templates,run.parameters) for f in files}
        pairs=[]
        for a,b in combinations(files,2):
            if a.submission.student_id==b.submission.student_id:continue
            result=compare_files(a,b,templates,run.parameters,prepared=(prepared[a.id],prepared[b.id]))
            if result is not None:pairs.append(SimilarityPair(run=run,attachment_a=a,attachment_b=b,**asdict(result)))
        with transaction.atomic():
            SimilarityPair.objects.bulk_create(pairs,batch_size=100)
            run.status='completed';run.finished_at=timezone.now();run.save(update_fields=['status','finished_at'])
            audit(actor,'similarity.run',run,pair_count=len(pairs))
    except Exception as exc:
        run.status='failed';run.finished_at=timezone.now();run.error_message=f'检测未完成（{type(exc).__name__}），请检查文件或重新运行'
        run.save(update_fields=['status','finished_at','error_message'])
    return run
