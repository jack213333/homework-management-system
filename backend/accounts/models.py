from django.contrib.auth.models import AbstractUser, Group
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "管理员"
        TEACHER = "teacher", "教师"
        STUDENT = "student", "学生"

    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    display_name = models.CharField(max_length=80)
    student_number = models.CharField(max_length=40, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        group, _ = Group.objects.get_or_create(name=self.role)
        self.groups.set([group])


class AuditEvent(models.Model):
    actor = models.ForeignKey(User, on_delete=models.PROTECT, null=True)
    action = models.CharField(max_length=60)
    object_type = models.CharField(max_length=60)
    object_id = models.CharField(max_length=60)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
