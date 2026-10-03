from django.http import FileResponse, JsonResponse
from django.conf import settings
from django.views.decorators.clickjacking import xframe_options_deny

def api_not_found(request, rest=""):
    return JsonResponse({"code": "not_found", "message": "接口不存在"}, status=404)

@xframe_options_deny
def index(request, rest=""):
    target = settings.PATHS.frontend_dist / "index.html"
    if not target.exists():
        return JsonResponse({"message": "请先构建前端：npm --prefix frontend run build"}, status=503)
    response = FileResponse(target.open("rb"), content_type="text/html; charset=utf-8")
    response["Cache-Control"] = "no-cache"
    return response
