"""Real startup/database and two-writer regressions in isolated SQLite files."""

import os
from pathlib import Path
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]
SETUP = """
import django
django.setup()
from django.core.management import call_command
call_command('migrate', interactive=False, verbosity=0)
from accounts.models import User
from classroom.models import Course, Enrollment
from assignments.models import Assignment, Submission
"""
STARTUP = """
from types import SimpleNamespace
from unittest.mock import patch
from desktop.launcher import launch
fake = SimpleNamespace(run=lambda: None, close=lambda: None)
def boot():
    with patch('waitress.create_server', return_value=fake):
        assert launch(port=0, open_browser=False) == 0
"""


def isolated_run(tmp_path, script):
    env = dict(os.environ)
    env.update(
        HOMEWORK_DATA_DIR=str(tmp_path / "runtime"),
        DJANGO_SETTINGS_MODULE="config.settings",
        PYTHONPATH=os.pathsep.join([str(ROOT), str(ROOT / "backend")]),
        PYTHONDONTWRITEBYTECODE="1",
    )
    result = subprocess.run(
        [sys.executable, "-B", "-c", script],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=45,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_restart_keeps_course_edits_and_removed_enrollment(tmp_path):
    isolated_run(
        tmp_path,
        SETUP
        + STARTUP
        + """
boot()
Course.objects.filter(code='SD2026').update(code='SD-REVISED')
assignment = Assignment.objects.filter(course__code='PY2026').first()
assignment.title = 'Teacher revised the title'
assignment.save(update_fields=['title'])
Enrollment.objects.filter(course__code='PY2026', student__username='student04').delete()
before = (User.objects.count(), Course.objects.count(), Assignment.objects.count(), Enrollment.objects.count(), Submission.objects.count())
boot()
after = (User.objects.count(), Course.objects.count(), Assignment.objects.count(), Enrollment.objects.count(), Submission.objects.count())
assert before == after, (before, after)
assert not Enrollment.objects.filter(course__code='PY2026', student__username='student04').exists()
assignment.refresh_from_db()
assert assignment.title == 'Teacher revised the title'
""",
    )


def test_restart_accepts_legal_duplicate_assignment_titles(tmp_path):
    isolated_run(
        tmp_path,
        SETUP
        + STARTUP
        + """
boot()
original = Assignment.objects.first()
Assignment.objects.create(course=original.course, title=original.title, deadline=original.deadline)
before = Assignment.objects.count()
boot()
assert Assignment.objects.count() == before
""",
    )


def test_existing_empty_migrated_database_gets_complete_demo_once(tmp_path):
    isolated_run(
        tmp_path,
        SETUP
        + STARTUP
        + """
assert not User.objects.exists()
boot()
assert Submission.objects.count() > 0, 'Missing first-run demo submissions'
before = Submission.objects.count()
boot()
assert Submission.objects.count() == before
""",
    )


def test_existing_user_database_does_not_gain_demo_accounts(tmp_path):
    isolated_run(
        tmp_path,
        SETUP
        + STARTUP
        + """
User.objects.create(username='existing-owner', role='admin', display_name='Existing owner')
boot()
assert list(User.objects.values_list('username', flat=True)) == ['existing-owner']
assert Course.objects.count() == 0
""",
    )


RACE = """
import uuid
from datetime import timedelta
from threading import Event, Thread
from django.db import connections, transaction
from django.db.models import F
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError
from assignments.serializers import AssignmentSerializer
from assignments.submissions import create_submission
teacher = User.objects.create(username='teacher', role='teacher')
student = User.objects.create(username='student', role='student')
course = Course.objects.create(code='RACE', name='Race regression', teacher=teacher)
Enrollment.objects.create(course=course, student=student)
assignment = Assignment.objects.create(course=course, title='Concurrent assignment', status='open', deadline=timezone.now()+timedelta(days=1), require_code=False)
validated, release, attempted, written = Event(), Event(), Event(), Event()
outcomes, errors = {}, []
original_validate = AssignmentSerializer.validate
def paused_validation(serializer, attrs):
    result = original_validate(serializer, attrs)
    validated.set()
    assert release.wait(10), 'Timed out releasing edit'
    return result
AssignmentSerializer.validate = paused_validation
def editor():
    try:
        client = APIClient()
        client.force_authenticate(user=teacher)
        response = client.patch(f'/api/assignments/{assignment.pk}/', payload, format='json')
        outcomes['edit_status'] = response.status_code
    except BaseException as exc:
        errors.append(repr(exc))
    finally:
        connections.close_all()
def writer():
    try:
        attempted.set()
        if mode == 'template':
            with transaction.atomic():
                Assignment.objects.filter(pk=assignment.pk).update(template_revision=F('template_revision')+1)
        else:
            try:
                create_submission(actor=student, assignment=assignment, request_id=uuid.uuid4(), comment='', report_files=[SimpleUploadedFile('report.txt', b'An isolated concurrent submission report.')], code_files=[])
            except ValidationError:
                outcomes['submission_rejected'] = True
    except BaseException as exc:
        errors.append(repr(exc))
    finally:
        written.set()
        connections.close_all()
first = Thread(target=editor)
second = Thread(target=writer)
try:
    first.start()
    assert validated.wait(10), 'Edit did not reach validation barrier'
    second.start()
    assert attempted.wait(5)
    committed_before_save = written.wait(1)
finally:
    release.set()
    first.join(10)
    if second.ident:
        second.join(10)
assert not first.is_alive() and not second.is_alive()
assert not errors, errors
assignment.refresh_from_db()
if mode == 'template':
    assert assignment.template_revision == 1, 'Editing description rolled back template revision'
elif mode == 'draft':
    assert not (assignment.status == 'draft' and Submission.objects.exists()), 'A completed first submission became hidden in a draft'
elif committed_before_save and Submission.objects.exists():
    assert assignment.total_score == 100 or outcomes['edit_status'] == 400, 'Full score changed after first submission was committed'
"""


@pytest.mark.parametrize(
    ("mode", "payload"),
    [
        ("template", {"description": "Edited description"}),
        ("draft", {"status": "draft"}),
        ("score", {"total_score": "50.00"}),
    ],
)
def test_assignment_edit_and_second_writer_are_serializable(tmp_path, mode, payload):
    isolated_run(tmp_path, SETUP + f"mode={mode!r}\npayload={payload!r}\n" + RACE)
