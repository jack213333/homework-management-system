from assignments.models import Grade
from .test_grading import make_submission


def test_csv_escapes_formula_names(client, student, teacher, assignment):
    student.display_name = '=HYPERLINK("https://example.com")'
    student.save()
    sub = make_submission(assignment, student)
    Grade.objects.create(submission=sub, grader=teacher, score=80, feedback="@formula")
    client.force_login(teacher)
    response = client.get(f"/api/assignments/{assignment.id}/grades/export/")
    assert response.status_code == 200
    import csv, io

    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
    assert rows[1][0].startswith("'=")
    assert "'@formula" in rows[1]
