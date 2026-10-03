from rest_framework.test import APIClient


def test_teacher_cannot_access_other_course(client, other_teacher, course):
    client.force_login(other_teacher)
    assert client.get(f"/api/courses/{course.id}/").status_code == 404
    assert client.get("/api/courses/").json()["results"] == []


def test_seed_demo_preserves_password_and_relationships(db):
    from django.core.management import call_command
    from accounts.models import User
    from classroom.models import Course, Enrollment

    call_command("seed_demo")
    counts = (User.objects.count(), Course.objects.count(), Enrollment.objects.count())
    user = User.objects.get(username="student01")
    user.set_password("changed-password")
    user.save()
    call_command("seed_demo")
    user.refresh_from_db()
    assert user.check_password("changed-password")
    assert (
        User.objects.count(),
        Course.objects.count(),
        Enrollment.objects.count(),
    ) == counts


def test_seed_demo_without_console(db, monkeypatch):
    import sys
    from django.core.management import call_command

    monkeypatch.setattr(sys, "stdout", None)
    call_command("seed_demo", verbosity=0)


def test_teacher_can_edit_own_course_but_not_enroll(client, teacher, student, course):
    client.force_login(teacher)
    assert (
        client.patch(
            f"/api/courses/{course.id}/", {"description": "完善课程说明"}, format="json"
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/courses/{course.id}/enrollments/",
            {"student_id": student.id},
            format="json",
        ).status_code
        == 403
    )


def test_admin_archive_and_nested_assignments(client, admin, course, assignment):
    client.force_login(admin)
    response = client.get(f"/api/courses/{course.id}/assignments/")
    assert (
        response.status_code == 200
        and response.json()["results"][0]["id"] == assignment.id
    )
    assert client.post(f"/api/courses/{course.id}/archive/").status_code == 200
    course.refresh_from_db()
    assert course.status == "archived"


def test_student_cannot_change_role(client, student, teacher):
    client.force_login(student)
    r = client.patch(f"/api/users/{teacher.id}/", {"role": "admin"}, format="json")
    assert r.status_code == 403


def test_inactive_session_rejected(client, teacher):
    client.force_login(teacher)
    teacher.is_active = False
    teacher.save()
    assert client.get("/api/auth/me/").status_code == 403


def test_last_admin_cannot_be_disabled(client, admin):
    client.force_login(admin)
    r = client.patch(f"/api/users/{admin.id}/", {"is_active": False}, format="json")
    assert r.status_code == 400
    admin.refresh_from_db()
    assert admin.is_active


def test_login_requires_csrf(teacher):
    client = APIClient(enforce_csrf_checks=True)
    assert (
        client.post(
            "/api/auth/login/",
            {"username": "teacher", "password": "DemoPass123!"},
            format="json",
        ).status_code
        == 403
    )
    token = client.get("/api/auth/csrf/").json()["csrf_token"]
    r = client.post(
        "/api/auth/login/",
        {"username": "teacher", "password": "DemoPass123!"},
        format="json",
        HTTP_X_CSRFTOKEN=token,
    )
    assert r.status_code == 200
    assert client.get("/api/auth/me/").json()["role"] == "teacher"


def test_password_validation_returns_400(client, admin):
    client.force_login(admin)
    assert (
        client.post(
            "/api/users/",
            {
                "username": "weak",
                "display_name": "测试",
                "role": "student",
                "password": "123",
            },
            format="json",
        ).status_code
        == 400
    )
    assert (
        client.post(
            f"/api/users/{admin.id}/reset-password/",
            {"new_password": "123"},
            format="json",
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/auth/change-password/",
            {"old_password": "DemoPass123!", "new_password": None},
            format="json",
        ).status_code
        == 400
    )
