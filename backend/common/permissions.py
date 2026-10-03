from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied
from classroom.models import Course


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user.is_authenticated
            and request.user.is_active
            and request.user.role == "admin"
        )


def visible_courses(user):
    if user.role == "admin":
        return Course.objects.all()
    if user.role == "teacher":
        return Course.objects.filter(teacher=user)
    return Course.objects.filter(enrollments__student=user)


def require_course_access(user, course, write=False):
    if (
        not user.is_active
        or not visible_courses(user).filter(pk=course.pk).exists()
        or (write and user.role == "student")
    ):
        raise PermissionDenied("无权操作这门课程")
