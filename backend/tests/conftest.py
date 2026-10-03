import pytest
from accounts.models import User
from rest_framework.test import APIClient

@pytest.fixture
def admin(db):
    return User.objects.create_user(username="admin", password="DemoPass123!", display_name="管理员", role="admin")
@pytest.fixture
def teacher(db):
    return User.objects.create_user(username="teacher", password="DemoPass123!", display_name="张老师", role="teacher")
@pytest.fixture
def other_teacher(db):
    return User.objects.create_user(username="teacher2", password="DemoPass123!", display_name="李老师", role="teacher")
@pytest.fixture
def student(db):
    return User.objects.create_user(username="student", password="DemoPass123!", display_name="示例同学", role="student")
@pytest.fixture
def other_student(db):
    return User.objects.create_user(username="student2", password="DemoPass123!", display_name="示例同学二", role="student")
@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def course(teacher, student):
    from classroom.models import Course, Enrollment
    course=Course.objects.create(code="TEST001",name="测试课程",teacher=teacher)
    Enrollment.objects.create(course=course,student=student)
    return course
