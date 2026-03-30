"""Local development settings."""
from .base import *  # noqa

DEBUG = True

# Base hosts + optional extras (ngrok, tunnel URLs, preview deploys).
# Set EXTRA_ALLOWED_HOSTS=abc123.ngrok-free.app,your-app.vercel.app
_base_hosts = ["localhost", "127.0.0.1", "0.0.0.0"]
_extra = config(
    "EXTRA_ALLOWED_HOSTS",
    default="",
    cast=lambda v: [s.strip() for s in v.split(",") if s.strip()],
)
ALLOWED_HOSTS = list(dict.fromkeys(_base_hosts + _extra))

# CORS — dev + optional preview / production frontends
_cors_base = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_cors_extra = config(
    "EXTRA_CORS_ORIGINS",
    default="",
    cast=lambda v: [s.strip() for s in v.split(",") if s.strip()],
)
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(_cors_base + _cors_extra))
CORS_ALLOW_CREDENTIALS = True

# Looser throttling in dev
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "1000/minute",
    "user": "1000/minute",
    "judge_demo": "100/minute",
    "spore_query": "300/minute",
    "spore_ingest": "200/minute",
    "spore_ops": "500/minute",
    "spore_relationship": "300/minute",
    "spore_brief_generate": "200/minute",
}

# Django extensions
INSTALLED_APPS += ["django_extensions"]  # noqa: F405

# Email — print to console in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Celery — run tasks synchronously in dev (set to False to use Redis worker)
CELERY_TASK_ALWAYS_EAGER = False

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO"},
        "apps": {"handlers": ["console"], "level": "DEBUG"},
        "celery": {"handlers": ["console"], "level": "INFO"},
    },
}
