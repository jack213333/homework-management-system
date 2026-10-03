from django.http import JsonResponse
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException

class Conflict(APIException):
    status_code = 409
    default_detail = "内容已变化，请刷新后重试"
    default_code = "conflict"

class TooLarge(APIException):
    status_code = 413
    default_detail = "附件超过大小限制"
    default_code = "too_large"

def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        details = response.data
        message = details.get("detail") if isinstance(details, dict) else None
        if not message:
            values = list(details.values()) if isinstance(details, dict) else details
            message = "；".join(str(v[0] if isinstance(v,list) else v) for v in values)
        response.data = {"code": getattr(exc,"default_code","error"), "message":str(message), "fields":details if isinstance(details,dict) and "detail" not in details else {}}
    return response

def csrf_failure(request, reason=""):
    return JsonResponse({"code":"csrf_failed","message":"安全令牌已失效，请刷新页面后重试","fields":{}}, status=403)
