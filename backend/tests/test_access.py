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
    counts=(User.objects.count(),Course.objects.count(),Enrollment.objects.count())
    user=User.objects.get(username="student01");user.set_password("changed-password");user.save()
    call_command("seed_demo")
    user.refresh_from_db()
    assert user.check_password("changed-password")
    assert (User.objects.count(),Course.objects.count(),Enrollment.objects.count()) == counts

def test_seed_demo_without_console(db, monkeypatch):
    import sys
    from django.core.management import call_command
    monkeypatch.setattr(sys,"stdout",None)
    call_command("seed_demo",verbosity=0)

def test_student_cannot_change_role(client, student, teacher):
    client.force_login(student)
    r = client.patch(f"/api/users/{teacher.id}/", {"role":"admin"}, format="json")
    assert r.status_code == 403

def test_inactive_session_rejected(client, teacher):
    client.force_login(teacher)
    teacher.is_active = False; teacher.save()
    assert client.get("/api/auth/me/").status_code == 403

def test_last_admin_cannot_be_disabled(client, admin):
    client.force_login(admin)
    r = client.patch(f"/api/users/{admin.id}/", {"is_active":False}, format="json")
    assert r.status_code == 400
    admin.refresh_from_db(); assert admin.is_active

def test_login_requires_csrf(teacher):
    client = APIClient(enforce_csrf_checks=True)
    assert client.post("/api/auth/login/", {"username":"teacher", "password":"DemoPass123!"}, format="json").status_code == 403
    token = client.get("/api/auth/csrf/").json()["csrf_token"]
    r = client.post("/api/auth/login/", {"username":"teacher", "password":"DemoPass123!"}, format="json", HTTP_X_CSRFTOKEN=token)
    assert r.status_code == 200
    assert client.get("/api/auth/me/").json()["role"] == "teacher"
