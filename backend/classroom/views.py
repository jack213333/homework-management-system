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
    serializer_class = CourseSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return visible_courses(self.request.user).select_related("teacher")

    def _admin(self):
        if self.request.user.role != "admin":
            raise PermissionDenied("课程维护需要管理员权限")

    def perform_create(self, serializer):
        self._admin()
        course = serializer.save()
        audit(self.request.user, "course.create", course)

    def perform_update(self, serializer):
        require_course_access(self.request.user, serializer.instance, write=True)
        if self.request.user.role != "admin":
            attrs = serializer.validated_data
            if (
                "teacher" in attrs
                and attrs["teacher"].pk != serializer.instance.teacher_id
            ) or ("status" in attrs and attrs["status"] != serializer.instance.status):
                raise PermissionDenied("教师不能变更任课教师或归档课程")
        course = serializer.save()
        audit(self.request.user, "course.update", course)

    def destroy(self, request, *args, **kwargs):
        self._admin()
        course = self.get_object()
        course.status = "archived"
        course.save()
        audit(request.user, "course.archive", course)
        return Response(status=204)

    @action(detail=True, methods=["get", "post"])
    def enrollments(self, request, pk=None):
        course = self.get_object()
        require_course_access(request.user, course, write=True)
        if request.method == "GET":
            return Response(
                EnrollmentSerializer(
                    course.enrollments.select_related("student"), many=True
                ).data
            )
        self._admin()
        if course.status != "active":
            raise ValidationError("归档课程不能新增成员")
        serializer = EnrollmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enrollment, created = Enrollment.objects.get_or_create(
            course=course, student=serializer.validated_data["student"]
        )
        if created:
            audit(request.user, "enrollment.create", enrollment)
        return Response(
            EnrollmentSerializer(enrollment).data, status=201 if created else 200
        )

    @action(
        detail=True, methods=["delete"], url_path=r"enrollments/(?P<enrollment_id>\d+)"
    )
    def remove_enrollment(self, request, pk=None, enrollment_id=None):
        self._admin()
        course = self.get_object()
        require_course_access(request.user, course, write=True)
        enrollment = get_object_or_404(Enrollment, pk=enrollment_id, course=course)
        if (
            hasattr(enrollment.student, "submissions")
            and enrollment.student.submissions.filter(
                assignment__course=course
            ).exists()
        ):
            raise ValidationError("学生已有提交，需要保留课程关系")
        audit(request.user, "enrollment.remove", enrollment)
        enrollment.delete()
        return Response(status=204)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        self._admin()
        course = self.get_object()
        course.status = "archived"
        course.save()
        audit(request.user, "course.archive", course)
        return Response(CourseSerializer(course).data)

    @action(detail=True, methods=["get", "post"])
    def assignments(self, request, pk=None):
        from assignments.views import visible_assignments
        from assignments.serializers import AssignmentSerializer

        course = self.get_object()
        if request.method == "GET":
            page = self.paginate_queryset(
                visible_assignments(request.user).filter(course=course)
            )
            return self.get_paginated_response(
                AssignmentSerializer(page, many=True, context={"request": request}).data
            )
        require_course_access(request.user, course, write=True)
        serializer = AssignmentSerializer(
            data={**request.data, "course_id": course.pk}, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        audit(request.user, "assignment.create", obj)
        return Response(serializer.data, status=201)
