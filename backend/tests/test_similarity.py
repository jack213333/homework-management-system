import hashlib
import uuid
from pathlib import Path
from decimal import Decimal
import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from assignments.submissions import create_submission
from assignments.grading import save_grade
from classroom.models import Enrollment

pytestmark=pytest.mark.django_db
REPORT='电子作业管理系统应当完整记录学生提交的报告与源代码，并且按照版本保存批改反馈。教师需要查看对应课程的学生作业，不能访问其他教师任教课程的数据。系统以本地数据库存储账号、课程和作业信息，原始文件通过授权接口提供下载。'
CODE='\n'.join(f'value_{i} = {i} * 3 + 5\nprint(value_{i})' for i in range(24))
def submit(student,assignment,report=REPORT,code=CODE):
    Enrollment.objects.get_or_create(course=assignment.course,student=student)
    return create_submission(actor=student,assignment=assignment,request_id=uuid.uuid4(),comment='',report_files=[SimpleUploadedFile('报告.txt',report.encode())],code_files=[SimpleUploadedFile('程序.py',code.encode())])

def test_identical_file_renamed(student,other_student,assignment):
    from plagiarism.comparison import compare_files,DEFAULT_PARAMETERS
    a=submit(student,assignment).attachments.get(kind='report');b=submit(other_student,assignment).attachments.get(kind='report')
    b.original_name='另一个名字.txt';b.save()
    result=compare_files(a,b,[],DEFAULT_PARAMETERS)
    assert result.exact_duplicate and result.coverage_a == 1
    (Path(settings.MEDIA_ROOT)/b.storage_key).write_bytes(b'changed')
    assert not compare_files(a,b,[],DEFAULT_PARAMETERS).exact_duplicate

def test_code_whitespace_and_comments():
    from plagiarism.normalization import tokenize_code
    assert tokenize_code(CODE,'python').units == tokenize_code('# 示例说明\n'+CODE.replace(' = ','   =  ')+'\n# 结束','python').units

def test_partial_report_copy_has_local_spans(student,other_student,assignment):
    from plagiarism.comparison import compare_files,DEFAULT_PARAMETERS
    a=submit(student,assignment).attachments.get(kind='report');b=submit(other_student,assignment,'这是自己的摘要。'+REPORT+'这是自己的结论。').attachments.get(kind='report')
    result=compare_files(a,b,[],DEFAULT_PARAMETERS)
    assert result.matches and result.coverage_a > 0.5
    match=result.matches[0]
    assert a.extracted_text[match['a_start']:match['a_end']] and b.extracted_text[match['b_start']:match['b_end']]

def test_teacher_template_excluded(client,teacher,student,other_student,assignment):
    from plagiarism.runner import run_similarity
    submit(student,assignment);submit(other_student,assignment)
    client.force_login(teacher)
    response=client.post(f'/api/assignments/{assignment.id}/templates/',{'kind':'report','file':SimpleUploadedFile('模板.txt',REPORT.encode())},format='multipart')
    assert response.status_code==201
    run=run_similarity(actor=teacher,assignment=assignment)
    pair=run.pairs.get(mode='report')
    assert pair.coverage_a is None and pair.matches==[] and '模板' in pair.note

def test_previous_version_excluded(student,other_student,teacher,assignment):
    from plagiarism.runner import run_similarity
    old=submit(student,assignment);new=submit(student,assignment);second=submit(other_student,assignment)
    run=run_similarity(actor=teacher,assignment=assignment)
    assert run.submission_ids==sorted([new.id,second.id])
    assert not run.pairs.filter(attachment_a__submission=old).exists()

def test_short_content_insufficient(student,other_student,teacher,assignment):
    from plagiarism.runner import run_similarity
    submit(student,assignment,'短文本','print(1)');submit(other_student,assignment,'另一短文','print(2)')
    run=run_similarity(actor=teacher,assignment=assignment)
    assert all(p.coverage_a is None and p.coverage_b is None for p in run.pairs.all())

def test_failed_parse_not_zero_similarity(student,other_student,teacher,assignment):
    from plagiarism.runner import run_similarity
    a=submit(student,assignment);submit(other_student,assignment)
    a.attachments.filter(kind='report').update(extraction_status='unsupported',extracted_text='',extraction_note='扫描件没有文字')
    pair=run_similarity(actor=teacher,assignment=assignment).pairs.get(mode='report')
    assert pair.coverage_a is None and '提取' in pair.note

def test_new_submission_marks_run_stale(student,other_student,teacher,assignment):
    from plagiarism.runner import run_similarity,is_stale
    submit(student,assignment);submit(other_student,assignment)
    run=run_similarity(actor=teacher,assignment=assignment);assert not is_stale(run)
    submit(student,assignment);assert is_stale(run)

def test_review_does_not_change_grade(client,student,other_student,teacher,assignment):
    from plagiarism.runner import run_similarity
    a=submit(student,assignment);submit(other_student,assignment)
    grade=save_grade(actor=teacher,submission=a,score=Decimal('88'),feedback='独立批改')
    pair=run_similarity(actor=teacher,assignment=assignment).pairs.first()
    client.force_login(teacher)
    assert client.put(f'/api/similarity-pairs/{pair.id}/review/',{'status':'follow_up','comment':'课后核实'},format='json').status_code==200
    grade.refresh_from_db();assert grade.score==Decimal('88') and grade.feedback=='独立批改'

def test_cross_teacher_pair_hidden(client,student,other_student,teacher,other_teacher,assignment):
    from plagiarism.runner import run_similarity
    submit(student,assignment);submit(other_student,assignment)
    pair=run_similarity(actor=teacher,assignment=assignment).pairs.first()
    client.force_login(other_teacher);assert client.get(f'/api/similarity-pairs/{pair.id}/').status_code==404
    client.force_login(student);assert client.get(f'/api/similarity-pairs/{pair.id}/').status_code==404

def test_winnowing_deterministic_rightmost():
    from plagiarism.fingerprints import winnow
    first=winnow(list('a'*35),20,10)
    assert first[0].unit_start==9 and [f.unit_start for f in first]==list(range(9,16))
    assert first==winnow(list('a'*35),20,10)
