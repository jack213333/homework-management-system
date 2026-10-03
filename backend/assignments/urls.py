from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("assignments", views.AssignmentViewSet, basename="assignment")
router.register("submissions", views.SubmissionViewSet, basename="submission")
urlpatterns = [
    path("attachments/<int:pk>/download/", views.download),
    path("attachments/<int:pk>/content/", views.text_preview),
    path("attachments/<int:pk>/text/", views.text_preview),
] + router.urls
