import uuid
from pathlib import Path
from django.conf import settings
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action,api_view
from rest_framework.exceptions import ValidationError,PermissionDenied
from rest_framework.response import Response
from common.audit import audit
from common.permissions import visible_courses,require_course_access
from .models import Assignment,Submission,Attachment
from .serializers import AssignmentSerializer,SubmissionSerializer
from .submissions import create_submission

def visible_assignments(user):
    qs=Assignment.objects.filter(course__in=visible_courses(user)).select_related("course")
    return qs.exclude(status="draft") if user.role=="student" else qs

def visible_submissions(user):
    qs=Submission.objects.filter(assignment__in=visible_assignments(user)).select_related("student","assignment__course").prefetch_related("attachments")
    return qs.filter(student=user) if user.role=="student" else qs

class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class=AssignmentSerializer
    http_method_names=["get","post","patch","head","options"]
    def get_queryset(self):
        qs=visible_assignments(self.request.user)
        if self.request.query_params.get("course_id"):qs=qs.filter(course_id=self.request.query_params["course_id"])
        return qs
    def perform_create(self,serializer):
        if self.request.user.role=="student":raise PermissionDenied("只有教师可以发布作业")
        course=serializer.validated_data["course"];require_course_access(self.request.user,course,write=True)
        obj=serializer.save();audit(self.request.user,"assignment.create",obj)
    def perform_update(self,serializer):
        require_course_access(self.request.user,serializer.instance.course,write=True)
        obj=serializer.save();audit(self.request.user,"assignment.update",obj)
    @action(detail=True,methods=["get","post"])
    def submissions(self,request,pk=None):
        assignment=self.get_object()
        if request.method=="GET":
            qs=visible_submissions(request.user).filter(assignment=assignment)
            page=self.paginate_queryset(qs)
            return self.get_paginated_response(SubmissionSerializer(page,many=True,context={"request":request}).data)
        try:key=uuid.UUID(str(request.data.get("request_id")))
        except (ValueError,TypeError):raise ValidationError("请提供有效的提交请求编号")
        submission=create_submission(actor=request.user,assignment=assignment,request_id=key,comment=str(request.data.get("comment","")),report_files=request.FILES.getlist("report_files"),code_files=request.FILES.getlist("code_files"))
        return Response(SubmissionSerializer(submission,context={"request":request}).data,status=201)

class SubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class=SubmissionSerializer
    def get_queryset(self):return visible_submissions(self.request.user)

def accessible_attachment(request,pk):
    return get_object_or_404(Attachment,pk=pk,submission__in=visible_submissions(request.user))

@api_view(["GET"])
def download(request,pk):
    attachment=accessible_attachment(request,pk)
    path=Path(settings.MEDIA_ROOT)/attachment.storage_key
    if not path.is_file():raise ValidationError("原件不存在，请检查数据目录或备份")
    response=FileResponse(path.open("rb"),as_attachment=True,filename=attachment.original_name,content_type="application/octet-stream")
    response["X-Content-Type-Options"]="nosniff"
    return response

@api_view(["GET"])
def text_preview(request,pk):
    attachment=accessible_attachment(request,pk)
    return Response({"id":attachment.id,"original_name":attachment.original_name,"text":attachment.extracted_text,"locations":attachment.locations,"status":attachment.extraction_status,"note":attachment.extraction_note})
