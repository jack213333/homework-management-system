import csv
from decimal import Decimal
from io import StringIO
from .grading import latest_submissions

def assignment_statistics(assignment):
    latest=list(latest_submissions(assignment))
    grades=[s.grade for s in latest if hasattr(s,"grade")]
    average=sum((g.score for g in grades),Decimal(0))/len(grades) if grades else None
    distribution=[{"label":"<60%","count":0},{"label":"60–69%","count":0},{"label":"70–79%","count":0},{"label":"80–89%","count":0},{"label":"90–100%","count":0}]
    for grade in grades:
        percent=grade.score/assignment.total_score*100
        index=0 if percent<60 else min(4,int(percent//10)-5)
        distribution[index]["count"]+=1
    enrolled=assignment.course.enrollments.count()
    return {"enrolled_count":enrolled,"submitted_count":len(latest),"missing_count":max(0,enrolled-len(latest)),"late_count":sum(s.is_late for s in latest),"graded_count":len(grades),"published_count":sum(g.published_at is not None for g in grades),"average_score":str(average.quantize(Decimal("0.01"))) if average is not None else None,"score_distribution":distribution}

def grade_rows(assignment):
    latest={s.student_id:s for s in latest_submissions(assignment)}
    rows=[]
    for enrollment in assignment.course.enrollments.select_related("student").order_by("student__student_number","student_id"):
        student=enrollment.student;submission=latest.get(student.pk);grade=getattr(submission,"grade",None) if submission else None
        rows.append({"student_id":student.pk,"student_name":student.display_name,"student_number":student.student_number,"submission_id":submission.pk if submission else None,"version":submission.version if submission else None,"submitted_at":submission.submitted_at.isoformat() if submission else None,"is_late":submission.is_late if submission else False,"score":str(grade.score) if grade else None,"feedback":grade.feedback if grade else "","published_at":grade.published_at.isoformat() if grade and grade.published_at else None,"status":"已发布" if grade and grade.published_at else "待发布" if grade else "待批改" if submission else "未提交"})
    return rows

def csv_text(value):
    text=str(value or "")
    if text.lstrip().startswith(("=","+","-","@")) or text.startswith(("\t","\r","\n")):return "'"+text
    return text

def export_grades_csv(assignment):
    buf=StringIO();writer=csv.writer(buf);writer.writerow(["姓名","学号","版本","提交时间","状态","迟交","成绩","评语"])
    for row in grade_rows(assignment):
        writer.writerow([csv_text(row["student_name"]),csv_text(row["student_number"]),row["version"] or "",row["submitted_at"] or "",row["status"],"是" if row["is_late"] else "否",row["score"] or "",csv_text(row["feedback"])])
    return "\ufeff"+buf.getvalue()
