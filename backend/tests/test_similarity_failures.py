import pytest
from .test_similarity import submit

pytestmark = pytest.mark.django_db


def test_failed_run_api_reports_actionable_error(
    client, monkeypatch, student, other_student, teacher, assignment
):
    from plagiarism import runner

    submit(student, assignment)
    submit(other_student, assignment)

    def fail(*args, **kwargs):
        raise RuntimeError("example")

    monkeypatch.setattr(runner, "prepare_file", fail)
    client.force_login(teacher)
    response = client.post(f"/api/assignments/{assignment.id}/similarity-runs/")
    assert response.status_code == 500
    assert response.json()["code"] == "similarity_failed"
    assert response.json()["message"] and response.json()["id"]


def test_failure_persisted_and_restart_interrupts(
    monkeypatch, student, other_student, teacher, assignment
):
    from plagiarism import runner
    from plagiarism.models import SimilarityRun

    submit(student, assignment)
    submit(other_student, assignment)

    def fail(*args, **kwargs):
        raise RuntimeError("example")

    monkeypatch.setattr(runner, "prepare_file", fail)
    failed = runner.run_similarity(actor=teacher, assignment=assignment)
    assert (
        failed.status == "failed" and failed.pairs.count() == 0 and failed.finished_at
    )
    pending = SimilarityRun.objects.create(
        assignment=assignment,
        requested_by=teacher,
        status="running",
        template_revision=0,
    )
    assert runner.interrupt_runs() == 1
    pending.refresh_from_db()
    assert pending.status == "interrupted"


def test_template_change_stale_and_student_hidden(
    client, student, other_student, teacher, assignment
):
    from django.core.files.uploadedfile import SimpleUploadedFile
    from plagiarism.runner import run_similarity, is_stale

    submit(student, assignment)
    submit(other_student, assignment)
    run = run_similarity(actor=teacher, assignment=assignment)
    client.force_login(student)
    assert client.get(f"/api/assignments/{assignment.id}/templates/").status_code == 404
    client.force_login(teacher)
    response = client.post(
        f"/api/assignments/{assignment.id}/templates/",
        {"kind": "code", "file": SimpleUploadedFile("公共.py", b"print(1)")},
        format="multipart",
    )
    assert response.status_code == 201 and is_stale(run)
    assert client.delete(f"/api/templates/{response.json()['id']}/").status_code == 204
    assignment.refresh_from_db()
    assert assignment.template_revision == 2


def test_different_code_languages_not_compared(
    student, other_student, teacher, assignment
):
    from plagiarism.runner import run_similarity

    submit(student, assignment)
    b = submit(other_student, assignment)
    b.attachments.filter(kind="code").update(language="java")
    run = run_similarity(actor=teacher, assignment=assignment)
    assert list(run.pairs.values_list("mode", flat=True)) == ["report"]


def test_demo_work_idempotent_and_does_not_change_existing(db):
    from django.core.management import call_command
    from assignments.models import Submission

    call_command("seed_demo", verbosity=0)
    call_command("load_demo_work", verbosity=0)
    first = list(
        Submission.objects.values_list(
            "id", "student_id", "version", "request_fingerprint"
        )
    )
    call_command("load_demo_work", verbosity=0)
    assert len(first) == 3 and first == list(
        Submission.objects.values_list(
            "id", "student_id", "version", "request_fingerprint"
        )
    )
