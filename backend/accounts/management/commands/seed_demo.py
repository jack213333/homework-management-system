from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from accounts.models import User
from classroom.models import Course, Enrollment

class Command(BaseCommand):
    help="创建虚构演示账号；重复运行保留已有数据和密码"
    def handle(self,*args,**options):
        accounts=[("admin","演示管理员","admin"),("teacher","陈老师","teacher"),("teacher2","林老师","teacher"),("student01","顾知行","student"),("student02","许一诺","student"),("student03","周予安","student"),("student04","沈可欣","student")]
        users={}
        for username,name,role in accounts:
            user,created=User.objects.get_or_create(username=username,defaults={"display_name":name,"role":role,"student_number":username.replace("student","202600") if role=="student" else ""})
            if created:user.set_password("DemoPass123!");user.save()
            users[username]=user
        for role in ("admin","teacher","student"):
            group,_=Group.objects.get_or_create(name=role)
            perms=Permission.objects.filter(content_type__app_label__in=["accounts","classroom","assignments","plagiarism"])
            if role=="teacher":perms=perms.exclude(content_type__app_label="accounts")
            elif role=="student":perms=perms.filter(codename__startswith="view_")
            group.permissions.set(perms)
        for code,name,teacher in [("SD2026","软件设计综合实训","teacher"),("PY2026","Python 程序设计","teacher")]:
            course,_=Course.objects.get_or_create(code=code,defaults={"name":name,"teacher":users[teacher],"description":"从需求到实现，在每一次练习中建立清晰的工程思路。"})
            for username in ["student01","student02","student03","student04"]:
                Enrollment.objects.get_or_create(course=course,student=users[username])
        Course.objects.get_or_create(code="JV2026",defaults={"name":"Java 面向对象设计","teacher":users["teacher2"]})
        self.stdout.write("虚构演示数据已就绪（已有密码保持不变）")
