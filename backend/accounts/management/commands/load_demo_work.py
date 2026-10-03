import uuid
from django.core.management.base import BaseCommand
from django.core.files.uploadedfile import SimpleUploadedFile
from assignments.submissions import create_submission
from assignments.models import Assignment
from accounts.models import User

REPORT='''成绩统计程序设计报告（虚构演示样例）
一、需求说明
程序接收一组虚构成绩，计算有效分数的平均值。未提交和未批改的学生不能按零分计入平均值。输入数据先通过类型检查和范围检查，合法分数须介于零与满分之间。
二、处理流程
首先读取输入列表，随后逐项判断是否为数字。如果记录为空则跳过，若分数超出范围则抛出明确的异常。将有效分数累计后除以有效人数。没有有效成绩时返回空值，界面显示暂无成绩。
三、验证与讨论
样例一使用六十分与八十分以及两个空值，预期平均分为七十分。样例二只包含空值，预期没有平均分。样例三包含超出满分的记录，应被拒绝。本文件仅用于测试相似片段，不代表真实学生作业。
'''
CODE='''# 虚构演示数据；相似检测需要教师结合上下文复核。
def average_score(scores, full_score=100):
    valid = []
    for value in scores:
        if value is None:
            continue
        if not isinstance(value, (int, float)):
            raise ValueError("分数类型错误")
        if not 0 <= value <= full_score:
            raise ValueError("分数超出范围")
        valid.append(value)
    if not valid:
        return None
    return sum(valid) / len(valid)

def distribution(scores):
    bins = [0, 0, 0, 0, 0]
    for score in scores:
        if score is None:
            continue
        if score < 60: bins[0] += 1
        elif score < 70: bins[1] += 1
        elif score < 80: bins[2] += 1
        elif score < 90: bins[3] += 1
        else: bins[4] += 1
    return bins

if __name__ == "__main__":
    sample = [60, 80, None, None]
    print(average_score(sample))
    print(distribution(sample))
'''

class Command(BaseCommand):
    help='为虚构演示账号添加样例提交；已有提交保持不变，student04 留作未提交演示'
    def handle(self,*args,**options):
        assignment=Assignment.objects.filter(course__code='PY2026',title='练习 02 · 学生成绩统计程序').first()
        if not assignment:return
        count=0
        for index,name in enumerate(['student01','student02','student03']):
            user=User.objects.get(username=name)
            if assignment.submissions.filter(student=user).exists():continue
            if assignment.status!='open' or assignment.course.status!='active':continue
            from django.utils import timezone
            if not assignment.allow_late and assignment.deadline<timezone.now():continue
            report=REPORT if index!=2 else REPORT.replace('成绩统计程序','数据分析程序').replace('有效分数','有效记录')+'\n四、补充：应保存输入的校验结果，确保统计过程可追溯。'
            code=CODE if index==0 else '# 注释变化演示\n'+CODE.replace('    ','  ')
            create_submission(actor=user,assignment=assignment,request_id=uuid.uuid4(),comment='系统内置的虚构演示样例',report_files=[SimpleUploadedFile(f'演示报告{index+1}.txt',report.encode())],code_files=[SimpleUploadedFile(f'成绩统计{index+1}.py',code.encode())])
            count+=1
        if options.get('verbosity',1) and self.stdout._out is not None:self.stdout.write(f'已新增 {count} 份虚构演示提交（已有版本保持不变）')
