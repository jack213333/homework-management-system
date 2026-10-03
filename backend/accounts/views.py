import json
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_POST
from rest_framework import viewsets
from rest_framework.decorators import api_view, action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from common.permissions import IsAdmin
from common.audit import audit
from .models import User
from .serializers import UserSerializer, user_summary

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"csrf_token":get_token(request)})

@csrf_protect
@require_POST
def login_view(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"code":"invalid","message":"请提供正确的登录信息","fields":{}},status=400)
    if not isinstance(data,dict) or not isinstance(data.get("username"),str) or not isinstance(data.get("password"),str):
        return JsonResponse({"code":"invalid","message":"请输入账号和密码","fields":{}},status=400)
    user = authenticate(request, username=data["username"], password=data["password"])
    if user is None:
        return JsonResponse({"code":"invalid_credentials","message":"账号或密码错误，或账号已停用","fields":{}},status=401)
    login(request,user)
    return JsonResponse(user_summary(user))

@api_view(["GET"])
def me(request):
    return Response(user_summary(request.user))

@api_view(["POST"])
def logout_view(request):
    logout(request)
    return Response(status=204)

@api_view(["POST"])
def change_password(request):
    if not isinstance(request.data.get('old_password'), str) or not isinstance(request.data.get('new_password'), str):
        raise ValidationError('请输入正确的原密码与新密码')
    if not request.user.check_password(request.data.get("old_password", "")):
        raise ValidationError("原密码不正确")
    password = request.data.get("new_password", "")
    validate_password(password, request.user)
    request.user.set_password(password); request.user.save()
    update_session_auth_hash(request,request.user)
    return Response({"message":"密码已修改"})

@api_view(["GET"])
def roles(request):
    if request.user.role != "admin":
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied("仅管理员可管理角色")
    return Response([{"value":v,"label":label} for v,label in User.Role.choices])

class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    serializer_class = UserSerializer
    http_method_names = ["get","post","patch","head","options"]
    queryset = User.objects.all().order_by("id")
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request,*args,**kwargs)
    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("role"):
            qs = qs.filter(role=self.request.query_params["role"])
        if self.request.query_params.get("search"):
            from django.db.models import Q
            text=self.request.query_params["search"]
            qs=qs.filter(Q(username__icontains=text)|Q(display_name__icontains=text))
        return qs
    def perform_create(self, serializer):
        with transaction.atomic():
            user=serializer.save(); audit(self.request.user,"user.create",user)
    def perform_update(self, serializer):
        with transaction.atomic():
            user=serializer.save(); audit(self.request.user,"user.update",user,role=user.role,is_active=user.is_active)
    @action(detail=True, methods=["post"], url_path="reset-password")
    def reset_password(self, request, pk=None):
        user=self.get_object(); password=request.data.get("new_password", "")
        if not isinstance(password, str):
            raise ValidationError('请输入正确的新密码')
        validate_password(password,user)
        user.set_password(password);user.save()
        audit(request.user,"user.reset_password",user)
        return Response({"message":"密码已重置"})
