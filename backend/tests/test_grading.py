from decimal import Decimal
import uuid
from assignments.models import Submission, Grade
from classroom.models import Enrollment
from accounts.models import User


def make_submission(assignment, student, version=1):
    return Submission.objects.create(
        assignment=assignment,
        student=student,
        version=version,
        request_id=uuid.uuid4(),
        request_fingerprint="a" * 64,
        deadline_snapshot=assignment.deadline,
    )


def test_unpublished_grade_not_leaked(client, student, teacher, assignment):
    submission = make_submission(assignment, student)
    client.force_login(teacher)
    assert (
        client.put(
            f"/api/submissions/{submission.id}/grade/",
            {"score": "88.50", "feedback": "认真完成"},
            format="json",
        ).status_code
        == 200
    )
    client.force_login(student)
    assert client.get(f"/api/submissions/{submission.id}/").json()["grade"] is None
    client.force_login(teacher)
    assert (
        client.post(f"/api/assignments/{assignment.id}/grades/publish/").status_code
        == 200
    )
    client.force_login(student)
    assert (
        client.get(f"/api/submissions/{submission.id}/").json()["grade"]["score"]
        == "88.50"
    )


def test_resubmit_does_not_inherit_grade(client, student, teacher, assignment):
    first = make_submission(assignment, student)
    Grade.objects.create(submission=first, grader=teacher, score=75)
    second = make_submission(assignment, student, 2)
    client.force_login(student)
    assert client.get(f"/api/submissions/{second.id}/").json()["grade"] is None
    assert Grade.objects.get(submission=first).score == Decimal("75")


def test_save_old_version_conflict(client, student, teacher, assignment):
    first = make_submission(assignment, student)
    make_submission(assignment, student, 2)
    client.force_login(teacher)
    assert (
        client.put(
            f"/api/submissions/{first.id}/grade/",
            {"score": "99", "feedback": "旧版本"},
            format="json",
        ).status_code
        == 409
    )
    assert not Grade.objects.exists()


def test_average_excludes_missing_and_ungraded(client, student, teacher, assignment):
    first = make_submission(assignment, student)
    Grade.objects.create(submission=first, grader=teacher, score=60)
    for index, score in [(2, 80), (3, None), (4, None)]:
        user = User.objects.create_user(
            username=f"s{index}", display_name="虚构同学", role="student"
        )
        Enrollment.objects.create(course=assignment.course, student=user)
        if index != 4:
            sub = make_submission(assignment, user)
            if score is not None:
                Grade.objects.create(submission=sub, grader=teacher, score=score)
    client.force_login(teacher)
    response = client.get(f"/api/assignments/{assignment.id}/statistics/")
    assert response.status_code == 200
    data = response.json()
    assert data["average_score"] == "70.00"
    assert (
        data["submitted_count"] == 3
        and data["missing_count"] == 1
        and data["graded_count"] == 2
    )


def test_grade_edit_unpublishes(client, student, teacher, assignment):
    from django.utils import timezone

    sub = make_submission(assignment, student)
    grade = Grade.objects.create(
        submission=sub, grader=teacher, score=70, published_at=timezone.now()
    )
    client.force_login(teacher)
    assert (
        client.put(
            f"/api/submissions/{sub.id}/grade/",
            {"score": "80", "feedback": "修正评分"},
            format="json",
        ).status_code
        == 200
    )
    grade.refresh_from_db()
    assert grade.published_at is None


def test_score_limits_and_teacher_scope(
    client, student, teacher, other_teacher, assignment
):
    sub = make_submission(assignment, student)
    client.force_login(teacher)
    for score in ["-1", "101", "NaN"]:
        assert (
            client.put(
                f"/api/submissions/{sub.id}/grade/", {"score": score}, format="json"
            ).status_code
            == 400
        )
    client.force_login(other_teacher)
    assert (
        client.put(
            f"/api/submissions/{sub.id}/grade/", {"score": "90"}, format="json"
        ).status_code
        == 404
    )
    client.force_login(student)
    assert (
        client.get(f"/api/assignments/{assignment.id}/statistics/").status_code == 403
    )
