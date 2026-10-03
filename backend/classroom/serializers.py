from rest_framework import serializers
from accounts.models import User
from .models import Course, Enrollment

class CourseSerializer(serializers.ModelSerializer):
    teacher_id = serializers.PrimaryKeyRelatedField(source="teacher", queryset=User.objects.filter(role="teacher",is_active=True))
    teacher_name = serializers.CharField(source="teacher.display_name",read_only=True)
    student_count = serializers.IntegerField(source="enrollments.count",read_only=True)
    class Meta:
        model=Course
        fields=["id","code","name","description","teacher_id","teacher_name","status","student_count","created_at"]

class EnrollmentSerializer(serializers.ModelSerializer):
    student_id=serializers.PrimaryKeyRelatedField(source="student",queryset=User.objects.filter(role="student",is_active=True))
    display_name=serializers.CharField(source="student.display_name",read_only=True)
    username=serializers.CharField(source="student.username",read_only=True)
    class Meta:
        model=Enrollment
        fields=["id","student_id","display_name","username","created_at"]
