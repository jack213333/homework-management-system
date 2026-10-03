from rest_framework import serializers
from common.permissions import visible_courses
from classroom.models import Course
from .models import Assignment, Submission, Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = [
            "id",
            "kind",
            "original_name",
            "size_bytes",
            "language",
            "extraction_status",
            "extraction_note",
        ]


class SubmissionSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source="student.display_name", read_only=True)
    student_number = serializers.CharField(
        source="student.student_number", read_only=True
    )
    grade = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = [
            "id",
            "assignment_id",
            "student_id",
            "student_name",
            "student_number",
            "version",
            "submitted_at",
            "is_late",
            "comment",
            "attachments",
            "grade",
        ]

    def get_grade(self, obj):
        grade = getattr(obj, "grade", None)
        if grade is None:
            return None
        request = self.context.get("request")
        if request and request.user.role == "student" and grade.published_at is None:
            return None
        return {
            "score": str(grade.score),
            "feedback": grade.feedback,
            "graded_at": grade.graded_at,
            "published_at": grade.published_at,
            "grader_name": grade.grader.display_name,
        }


class AssignmentSerializer(serializers.ModelSerializer):
    course_id = serializers.PrimaryKeyRelatedField(
        source="course", queryset=Course.objects.all()
    )
    course_name = serializers.CharField(source="course.name", read_only=True)
    course_code = serializers.CharField(source="course.code", read_only=True)
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id",
            "course_id",
            "course_name",
            "course_code",
            "title",
            "description",
            "status",
            "deadline",
            "allow_late",
            "require_report",
            "require_code",
            "total_score",
            "template_revision",
            "created_at",
            "my_submission",
        ]
        read_only_fields = ["template_revision"]

    def validate(self, attrs):
        user = self.context["request"].user
        course = attrs.get("course", self.instance.course if self.instance else None)
        if course and not visible_courses(user).filter(pk=course.pk).exists():
            raise serializers.ValidationError("无权操作这门课程")
        if course and course.status != "active":
            raise serializers.ValidationError("课程已归档，不能修改作业")
        if self.instance and course.pk != self.instance.course_id:
            raise serializers.ValidationError("不能移动作业到另一课程")
        if (
            self.instance
            and self.instance.submissions.exists()
            and attrs.get("total_score", self.instance.total_score)
            != self.instance.total_score
        ):
            raise serializers.ValidationError("已有提交后不能改变满分")
        if (
            self.instance
            and self.instance.submissions.exists()
            and attrs.get("status") == "draft"
        ):
            raise serializers.ValidationError(
                "已有学生提交，不能改为草稿；停止提交请使用关闭功能"
            )
        if (
            attrs.get(
                "total_score", self.instance.total_score if self.instance else 100
            )
            <= 0
        ):
            raise serializers.ValidationError("满分必须大于零")
        if not attrs.get(
            "require_report", self.instance.require_report if self.instance else True
        ) and not attrs.get(
            "require_code", self.instance.require_code if self.instance else True
        ):
            raise serializers.ValidationError("报告与代码至少一类必交")
        return attrs

    def get_my_submission(self, obj):
        request = self.context.get("request")
        if not request or request.user.role != "student":
            return None
        latest = (
            obj.submissions.filter(student=request.user).order_by("-version").first()
        )
        return (
            SubmissionSerializer(latest, context=self.context).data if latest else None
        )

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        # Preserve independently maintained template_revision and timestamps
        # even if a caller holds an older model instance.
        instance.save(update_fields=[*validated_data, "updated_at"])
        return instance
