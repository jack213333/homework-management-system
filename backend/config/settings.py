from desktop.paths import resolve_paths
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
PATHS = resolve_paths()
SECRET_KEY = PATHS.secret_path.read_text(encoding="utf-8")
DEBUG = False
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]
INSTALLED_APPS = ["django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "accounts", "classroom", "rest_framework"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware", "whitenoise.middleware.WhiteNoiseMiddleware", "django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware", "django.middleware.csrf.CsrfViewMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": PATHS.database_path, "OPTIONS": {"timeout": 30}}}
AUTH_USER_MODEL = "accounts.User"
ROOT_URLCONF = "config.urls"
STATIC_URL = "/assets/"
STATIC_ROOT = PATHS.frontend_dist / "assets"
WHITENOISE_ROOT = PATHS.frontend_dist
MEDIA_ROOT = PATHS.uploads_root
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Strict"
CSRF_COOKIE_SAMESITE = "Strict"
X_FRAME_OPTIONS = "DENY"
DATA_UPLOAD_MAX_MEMORY_SIZE = 55 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024
LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
REST_FRAMEWORK = {"DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"], "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"]}
REST_FRAMEWORK.update({"EXCEPTION_HANDLER":"common.errors.api_exception_handler", "DEFAULT_PAGINATION_CLASS":"rest_framework.pagination.PageNumberPagination", "PAGE_SIZE":20})
CSRF_FAILURE_VIEW="common.errors.csrf_failure"
AUTH_PASSWORD_VALIDATORS=[{"NAME":"django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS":{"min_length":8}}]
