from django.urls import path, re_path, include
from django.http import JsonResponse
from .spa import index, api_not_found

def health(request):
    return JsonResponse({"app": "homework-management-system", "status": "ok", "version": "0.1.0"})

urlpatterns = [path("api/health", health), path("api/health/", health), path("api/",include("accounts.urls")),path("api/",include("classroom.urls")),path("api/",include("assignments.urls")),path("api/",include("plagiarism.urls")),re_path(r"^api/(?P<rest>.*)$", api_not_found), re_path(r"^(?P<rest>.*)$", index)]
