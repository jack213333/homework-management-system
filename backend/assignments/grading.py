from decimal import Decimal
from django.db import transaction
from django.db.models import OuterRef,Subquery
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from common.permissions import require_course_access
from common.errors import Conflict
from common.audit import audit
from .models import Submission,Grade

def latest_submissions(assignment):
    newest=Submission.objects.filter(assignment=assignment,student_id=OuterRef("student_id")).order_by("-version").values("pk")[:1]
    return Submission.objects.filter(assignment=assignment,pk=Subquery(newest)).select_related("student","grade__grader","assignment")

def save_grade(*,actor,submission,score:Decimal,feedback:str):
    with transaction.atomic():
        submission=Submission.objects.select_for_update().select_related("assignment__course").get(pk=submission.pk)
        require_course_access(actor,submission.assignment.course,write=True)
        if not score.is_finite() or score<0 or score>submission.assignment.total_score:raise ValidationError("分数必须在零与作业满分之间")
        if not latest_submissions(submission.assignment).filter(pk=submission.pk).exists():raise Conflict("学生已提交新版本，请刷新后批改最新版本")
        grade,_=Grade.objects.update_or_create(submission=submission,defaults={"grader":actor,"score":score,"feedback":feedback,"published_at":None})
        audit(actor,"grade.save",grade,submission_id=submission.pk,score=str(score))
        return grade

def publish_grades(*,actor,assignment):
    with transaction.atomic():
        require_course_access(actor,assignment.course,write=True)
        grades=Grade.objects.filter(submission__in=latest_submissions(assignment))
        count=grades.filter(published_at__isnull=True).update(published_at=timezone.now())
        audit(actor,"grades.publish",assignment,count=count)
        return count

def unpublish_grades(*,actor,assignment):
    with transaction.atomic():
        require_course_access(actor,assignment.course,write=True)
        count=Grade.objects.filter(submission__in=latest_submissions(assignment),published_at__isnull=False).update(published_at=None)
        audit(actor,"grades.unpublish",assignment,count=count)
        return count
