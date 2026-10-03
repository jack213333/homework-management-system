from pathlib import Path
import hashlib
import uuid
from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError,PermissionDenied
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from assignments.models import Assignment
from common.permissions import visible_courses,require_course_access
from common.errors import TooLarge
from common.audit import audit
from .models import AssignmentTemplate,SimilarityRun,SimilarityPair,SimilarityReview
from .extraction import extract_file
from .runner import run_similarity,is_stale

def writable_assignments(user):
    return Assignment.objects.filter(course__in=visible_courses(user)).select_related('course') if user.role!='student' else Assignment.objects.none()

def assignment_for(request,pk):
    return get_object_or_404(writable_assignments(request.user),pk=pk)

def review_data(pair):
    review=getattr(pair,'review',None)
    return {'status':review.status,'comment':review.comment,'reviewer_name':review.reviewer.display_name,'updated_at':review.updated_at} if review else {'status':'pending','comment':''}

def file_data(file):
    return {'id':file.id,'original_name':file.original_name,'kind':file.kind,'language':file.language,'student_name':file.submission.student.display_name,'version':file.submission.version,'extraction_status':file.extraction_status,'extraction_note':file.extraction_note}

def pair_data(pair,detail=False):
    result={'id':pair.id,'run_id':pair.run_id,'mode':pair.mode,'coverage_a':pair.coverage_a,'coverage_b':pair.coverage_b,'exact_duplicate':pair.exact_duplicate,'note':pair.note,'match_count':len(pair.matches),'attachment_a':file_data(pair.attachment_a),'attachment_b':file_data(pair.attachment_b),'review':review_data(pair)}
    if detail:result.update(matches=pair.matches,is_stale=is_stale(pair.run),assignment_id=pair.run.assignment_id)
    return result

def run_data(run,detail=False):
    result={'id':run.id,'assignment_id':run.assignment_id,'status':run.status,'submission_ids':run.submission_ids,'template_revision':run.template_revision,'algorithm_version':run.algorithm_version,'parameters':run.parameters,'started_at':run.started_at,'finished_at':run.finished_at,'error_message':run.error_message,'is_stale':is_stale(run),'pair_count':run.pairs.count()}
    if detail:result['pairs']=[pair_data(pair) for pair in run.pairs.select_related('attachment_a__submission__student','attachment_b__submission__student','review__reviewer')]
    return result

@api_view(['GET','POST'])
def templates(request,pk):
    assignment=assignment_for(request,pk)
    if request.method=='GET':
        return Response([{'id':t.id,'kind':t.kind,'language':t.language,'original_name':t.original_name,'extraction_status':t.extraction_status,'extraction_note':t.extraction_note,'revision':t.revision} for t in assignment.templates.all()])
    kind=request.data.get('kind');file=request.FILES.get('file')
    if kind not in ('report','code') or file is None:raise ValidationError('请选择模板类别与文件')
    suffix=Path(file.name).suffix.lower()
    if suffix not in (('.txt','.docx','.pdf') if kind=='report' else ('.py','.java')):raise ValidationError('模板文件格式与类别不匹配')
    if file.size>20*1024*1024:raise TooLarge()
    if len(file.name)>240:raise ValidationError('文件名称过长')
    language={'.py':'python','.java':'java'}.get(suffix)
    key=f'templates/{uuid.uuid4().hex}{suffix}';path=Path(settings.MEDIA_ROOT)/key
    path.parent.mkdir(parents=True,exist_ok=True)
    try:
        with path.open('xb') as stream:
            for chunk in file.chunks():stream.write(chunk)
        extraction=extract_file(path,kind,language)
        if extraction.status not in ('ready','partial'):raise ValidationError('公共模板无法提取文字，请提供可解析文件')
        with transaction.atomic():
            current=Assignment.objects.get(pk=assignment.pk)
            if current.templates.count()>=10:raise ValidationError('一份作业最多添加 10 个公共模板')
            current.template_revision+=1;current.save(update_fields=['template_revision'])
            t=AssignmentTemplate.objects.create(assignment=current,kind=kind,language=language,original_name=file.name,storage_key=key,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),extracted_text=extraction.text,locations=extraction.locations,extraction_status=extraction.status,extraction_note=extraction.note,revision=current.template_revision)
            audit(request.user,'template.create',t,revision=t.revision)
        return Response({'id':t.id,'original_name':t.original_name,'revision':t.revision},status=201)
    except Exception:
        path.unlink(missing_ok=True);raise

@api_view(['DELETE'])
def delete_template(request,pk):
    with transaction.atomic():
        template=get_object_or_404(AssignmentTemplate,pk=pk,assignment__in=writable_assignments(request.user))
        path=Path(settings.MEDIA_ROOT)/template.storage_key
        Assignment.objects.filter(pk=template.assignment_id).update(template_revision=F('template_revision')+1)
        audit(request.user,'template.remove',template)
        template.delete()
    # Orphaned disk cleanup can be retried without invalidating the committed metadata change.
    try:path.unlink(missing_ok=True)
    except OSError:pass
    return Response(status=204)

@api_view(['GET','POST'])
def runs(request,pk):
    assignment=assignment_for(request,pk)
    if request.method=='GET':
        paginator=PageNumberPagination();page=paginator.paginate_queryset(assignment.similarity_runs.all(),request)
        return paginator.get_paginated_response([run_data(run) for run in page])
    run=run_similarity(actor=request.user,assignment=assignment)
    data=run_data(run,detail=True)
    return Response(data,status=500 if run.status=='failed' else 201)

@api_view(['GET'])
def run_detail(request,pk):
    run=get_object_or_404(SimilarityRun,pk=pk,assignment__in=writable_assignments(request.user))
    return Response(run_data(run,detail=True))

def accessible_pair(request,pk):
    return get_object_or_404(SimilarityPair.objects.select_related('run','attachment_a__submission__student','attachment_b__submission__student','review__reviewer'),pk=pk,run__assignment__in=writable_assignments(request.user))

@api_view(['GET'])
def pair_detail(request,pk):
    return Response(pair_data(accessible_pair(request,pk),detail=True))

@api_view(['PUT'])
def review_pair(request,pk):
    class ReviewInput(serializers.Serializer):
        status=serializers.ChoiceField(choices=['pending','cleared','follow_up'])
        comment=serializers.CharField(required=False,allow_blank=True,max_length=5000,default='')
    data=ReviewInput(data=request.data);data.is_valid(raise_exception=True)
    with transaction.atomic():
        pair=accessible_pair(request,pk)
        review,_=SimilarityReview.objects.update_or_create(pair=pair,defaults={'reviewer':request.user,**data.validated_data})
        audit(request.user,'similarity.review',pair,status=review.status)
    return Response({'status':review.status,'comment':review.comment,'reviewer_name':request.user.display_name,'updated_at':review.updated_at})
