from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User

def user_summary(user):
    return {"id":user.id,"username":user.username,"display_name":user.display_name,"role":user.role,"student_number":user.student_number}

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    class Meta:
        model = User
        fields = ["id","username","display_name","student_number","role","is_active","password"]
    def validate(self, attrs):
        user = self.instance
        if not user and not attrs.get("password"):
            raise serializers.ValidationError({"password":"请设置初始密码"})
        if "password" in attrs:
            validate_password(attrs["password"], user)
        if user:
            role = attrs.get("role", user.role)
            active = attrs.get("is_active", user.is_active)
            if user.role == "admin" and user.is_active and (role != "admin" or not active):
                if not User.objects.filter(role="admin",is_active=True).exclude(pk=user.pk).exists():
                    raise serializers.ValidationError("不能停用或降级最后一个有效管理员")
            if role != user.role:
                if user.taught_courses.exists() or user.enrollments.exists() or (hasattr(user,"submissions") and user.submissions.exists()):
                    raise serializers.ValidationError("账号已关联课程或提交，不能改变角色；可停用后新建账号")
        return attrs
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key,value in validated_data.items():
            setattr(instance,key,value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
