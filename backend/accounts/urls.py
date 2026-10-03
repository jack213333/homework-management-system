from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
router = DefaultRouter()
router.register("users", views.UserViewSet)
urlpatterns = [path("auth/csrf/",views.csrf),path("auth/login/",views.login_view),path("auth/logout/",views.logout_view),path("auth/me/",views.me),path("auth/change-password/",views.change_password),path("roles/",views.roles),path("",include(router.urls))]
