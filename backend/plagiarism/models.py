from django.conf import settings
from django.db import models
from django.db.models import Q, F


class AssignmentTemplate(models.Model):
    assignment = models.ForeignKey(
        "assignments.Assignment", on_delete=models.PROTECT, related_name="templates"
    )
    kind = models.CharField(
        max_length=10, choices=[("report", "报告"), ("code", "代码")]
    )
    language = models.CharField(max_length=10, null=True, blank=True)
    original_name = models.CharField(max_length=240)
    storage_key = models.CharField(max_length=100, unique=True)
    sha256 = models.CharField(max_length=64)
    extracted_text = models.TextField(blank=True)
    locations = models.JSONField(default=list)
    extraction_status = models.CharField(max_length=20)
    extraction_note = models.TextField(blank=True)
    revision = models.PositiveIntegerField()


class SimilarityRun(models.Model):
    assignment = models.ForeignKey(
        "assignments.Assignment",
        on_delete=models.PROTECT,
        related_name="similarity_runs",
    )
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=20,
        choices=[
            ("running", "检测中"),
            ("completed", "完成"),
            ("failed", "失败"),
            ("interrupted", "已中断"),
        ],
    )
    submission_ids = models.JSONField(default=list)
    template_revision = models.PositiveIntegerField()
    algorithm_version = models.CharField(max_length=30, default="winnowing-v1")
    parameters = models.JSONField(default=dict)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ["-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["assignment"],
                condition=Q(status="running"),
                name="one_running_similarity",
            )
        ]


class SimilarityPair(models.Model):
    run = models.ForeignKey(
        SimilarityRun, on_delete=models.PROTECT, related_name="pairs"
    )
    attachment_a = models.ForeignKey(
        "assignments.Attachment", on_delete=models.PROTECT, related_name="pairs_a"
    )
    attachment_b = models.ForeignKey(
        "assignments.Attachment", on_delete=models.PROTECT, related_name="pairs_b"
    )
    mode = models.CharField(max_length=10)
    coverage_a = models.FloatField(null=True, blank=True)
    coverage_b = models.FloatField(null=True, blank=True)
    exact_duplicate = models.BooleanField(default=False)
    matches = models.JSONField(default=list)
    note = models.TextField(blank=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["run", "attachment_a", "attachment_b"],
                name="unique_similarity_pair",
            ),
            models.CheckConstraint(
                condition=Q(attachment_a__lt=F("attachment_b")),
                name="ordered_similarity_pair",
            ),
        ]


class SimilarityReview(models.Model):
    pair = models.OneToOneField(
        SimilarityPair, on_delete=models.PROTECT, related_name="review"
    )
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=12,
        choices=[
            ("pending", "待复核"),
            ("cleared", "已排除"),
            ("follow_up", "需进一步核实"),
        ],
        default="pending",
    )
    comment = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
