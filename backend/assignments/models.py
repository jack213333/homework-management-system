from django.conf import settings
from django.db import models
from django.db.models import Q

class Assignment(models.Model):
    course = models.ForeignKey("classroom.Course",on_delete=models.PROTECT,related_name="assignments")
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=10,choices=[("draft","草稿"),("open","开放提交"),("closed","已关闭")],default="draft")
    deadline = models.DateTimeField()
    allow_late = models.BooleanField(default=False)
    require_report = models.BooleanField(default=True)
    require_code = models.BooleanField(default=True)
    total_score = models.DecimalField(max_digits=6,decimal_places=2,default=100)
    template_revision = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering=["-created_at"]
        constraints=[models.CheckConstraint(condition=Q(total_score__gt=0),name="positive_total_score"),models.CheckConstraint(condition=Q(require_report=True)|Q(require_code=True),name="one_category_required")]

class Submission(models.Model):
    assignment=models.ForeignKey(Assignment,on_delete=models.PROTECT,related_name="submissions")
    student=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="submissions")
    version=models.PositiveIntegerField()
    request_id=models.UUIDField()
    request_fingerprint=models.CharField(max_length=64)
    submitted_at=models.DateTimeField(auto_now_add=True)
    deadline_snapshot=models.DateTimeField()
    is_late=models.BooleanField(default=False)
    comment=models.TextField(blank=True)
    class Meta:
        ordering=["-submitted_at"]
        constraints=[models.UniqueConstraint(fields=["assignment","student","version"],name="unique_submission_version"),models.UniqueConstraint(fields=["student","request_id"],name="unique_submission_request")]

class Attachment(models.Model):
    submission=models.ForeignKey(Submission,on_delete=models.PROTECT,related_name="attachments")
    kind=models.CharField(max_length=10,choices=[("report","报告"),("code","代码")])
    original_name=models.CharField(max_length=240)
    storage_key=models.CharField(max_length=100,unique=True)
    size_bytes=models.PositiveIntegerField()
    sha256=models.CharField(max_length=64)
    language=models.CharField(max_length=10,null=True,blank=True)
    extraction_status=models.CharField(max_length=20,default="pending")
    extracted_text=models.TextField(blank=True)
    locations=models.JSONField(default=list)
    extraction_note=models.TextField(blank=True)

class Grade(models.Model):
    submission=models.OneToOneField(Submission,on_delete=models.PROTECT,related_name="grade")
    grader=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="given_grades")
    score=models.DecimalField(max_digits=6,decimal_places=2)
    feedback=models.TextField(blank=True)
    graded_at=models.DateTimeField(auto_now=True)
    published_at=models.DateTimeField(null=True,blank=True)
    class Meta:
        constraints=[models.CheckConstraint(condition=Q(score__gte=0),name="nonnegative_grade")]
