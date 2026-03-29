"""
Production settings for AI(r)Drop.

Activates when DJANGO_SETTINGS_MODULE=config.settings.production.
Expects all secrets via environment variables — never hardcode here.

Key differences from local:
  - DEBUG=False, strict ALLOWED_HOSTS
  - HTTPS enforced via proxy header (not SECURE_SSL_REDIRECT — Gunicorn is behind Nginx/LB)
  - Database connection pooling (CONN_MAX_AGE)
  - JWT token blacklisting enabled
  - Structured JSON logging
  - Sentry integration (if DSN configured)
"""
from .base import *  # noqa
from decouple import config

DEBUG = False

ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="api.airdrop.works",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="https://airdrop.works",
    cast=lambda v: [s.strip() for s in v.split(",")],
)
CORS_ALLOW_CREDENTIALS = True

# ── Security ─────────────────────────────────────────────────────────────────
# Gunicorn runs behind Nginx/LB that terminates SSL, so we trust the
# X-Forwarded-Proto header instead of redirecting at the Django level.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# ── Database ─────────────────────────────────────────────────────────────────
# Persistent connections — avoids reconnect overhead on every request.
DATABASES["default"]["CONN_MAX_AGE"] = config(  # noqa: F405
    "DB_CONN_MAX_AGE", default=600, cast=int
)

# ── JWT ──────────────────────────────────────────────────────────────────────
# Enable token blacklisting so rotated refresh tokens can't be reused.
INSTALLED_APPS += ["rest_framework_simplejwt.token_blacklist"]  # noqa: F405
SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] = True  # noqa: F405

# ── Static files (Django 5.x STORAGES API) ──────────────────────────────────
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage",
    },
}

# ── Logging ──────────────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "django.utils.log.ServerFormatter",
            "format": '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "celery": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
