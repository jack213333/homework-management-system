from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from common.permissions import visible_courses, require_course_access
from common.audit import audit
from .models import Enrollment
from .serializers import CourseSerializer, EnrollmentSerializer

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class=CourseSerializer
    http_method_names=["get","post","patch","delete","head","options"]
    def get_queryset(self):
        return visible_courses(self.request.user).select_related("teacher")
    def _admin(self):
        if self.request.user.role != "admin":
            raise PermissionDenied("课程维护需要管理员权限")
    def perform_create(self, serializer):
        self._admin();course=serializer.save();audit(self.request.user,"course.create",course)
    def perform_update(self, serializer):
        self._admin();course=serializer.save();audit(self.request.user,"course.update",course)
    def destroy(self, request, *args, **kwargs):
        self._admin();course=self.get_object();course.status="archived";course.save()
        audit(request.user,"course.archive",course)
        return Response(status=204)
    @action(detail=True, methods=["get","post"])
    def enrollments(self, request, pk=None):
        course=self.get_object();require_course_access(request.user,course,write=True)
        if request.method == "GET":
            return Response(EnrollmentSerializer(course.enrollments.select_related("student"),many=True).data)
        if course.status != "active":
            raise ValidationError("归档课程不能新增成员")
        serializer=EnrollmentSerializer(data=request.data);serializer.is_valid(raise_exception=True)
        enrollment,created=Enrollment.objects.get_or_create(course=course,student=serializer.validated_data["student"])
        if created:audit(request.user,"enrollment.create",enrollment)
        return Response(EnrollmentSerializer(enrollment).data,status=201 if created else 200)
    @action(detail=True,methods=["delete"],url_path=r"enrollments/(?P<enrollment_id>\d+)")
    def remove_enrollment(self, request, pk=None, enrollment_id=None):
        course=self.get_object();require_course_access(request.user,course,write=True)
        enrollment=get_object_or_404(Enrollment,pk=enrollment_id,course=course)
        if hasattr(enrollment.student,"submissions") and enrollment.student.submissions.filter(assignment__course=course).exists():
            raise ValidationError("学生已有提交，需要保留课程关系")
        audit(request.user,"enrollment.remove",enrollment);enrollment.delete()
        return Response(status=204)
