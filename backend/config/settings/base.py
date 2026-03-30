"""
Base Django settings for airdrop-works.
Shared across local, production, and test environments.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _load_backend_env_file(path: Path) -> None:
    """Apply KEY=VALUE lines into os.environ only if the key is unset (orchestrator/env_file wins)."""
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key, value)


_settings_mod = os.environ.get("DJANGO_SETTINGS_MODULE", "")
if os.environ.get("DJANGO_ENV") == "production" or _settings_mod.endswith(
    ".production"
):
    _load_backend_env_file(BASE_DIR / ".env.production")

from decouple import config

SECRET_KEY = config("SECRET_KEY", default="insecure-dev-key-change-in-production")

DEBUG = False

ALLOWED_HOSTS: list[str] = []

# ── Application Definition ────────────────────────────────────────────────────

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_celery_beat",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.core",
    "apps.ai_core",
    "apps.judge",
    "apps.contributions",
    "apps.quests",
    "apps.profiles",
    "apps.leaderboard",
    "apps.rewards",
    "apps.payments",
    "apps.spore",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ── Database ──────────────────────────────────────────────────────────────────

import dj_database_url  # noqa: E402

DATABASES = {
    "default": dj_database_url.config(
        default=config(
            "DATABASE_URL",
            default="postgresql://postgres:postgres@localhost:5432/airdrop_works",
        )
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Auth ──────────────────────────────────────────────────────────────────────

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── Internationalization ──────────────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ── Static & Media ────────────────────────────────────────────────────────────

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ── REST Framework ────────────────────────────────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "common.pagination.DefaultPagePagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/minute",
        "user": "300/minute",
        "judge_demo": "10/minute",
        "spore_query": "20/minute",
        "spore_ingest": "20/minute",
        "spore_ops": "60/minute",
        "spore_relationship": "30/minute",
        "spore_brief_generate": "20/minute",
    },
    "EXCEPTION_HANDLER": "common.exceptions.custom_exception_handler",
}

# ── SimpleJWT ─────────────────────────────────────────────────────────────────

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# ── Redis & Celery ────────────────────────────────────────────────────────────

REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_ALWAYS_EAGER = False  # Override to True in tests

CRAWLER_BEAT_MINUTES = config("CRAWLER_BEAT_MINUTES", default=15, cast=int)
SPORE_SPORULATION_BEAT_MINUTES = config("SPORE_SPORULATION_BEAT_MINUTES", default=10, cast=int)
SPORE_AUDIT_RETENTION_DAYS = config("SPORE_AUDIT_RETENTION_DAYS", default=30, cast=int)

CELERY_BEAT_SCHEDULE = {
    "crawl-all-active-sources": {
        "task": "contributions.crawl_all_active_sources",
        "schedule": CRAWLER_BEAT_MINUTES * 60,
    },
    "leaderboard-rebuild-all": {
        "task": "leaderboard.rebuild_all",
        "schedule": 900,  # 15 minutes
    },
    "spore-sporulate-recent-nodes": {
        "task": "spore.sporulate_recent_nodes",
        "schedule": SPORE_SPORULATION_BEAT_MINUTES * 60,
    },
    "spore-purge-audit-logs": {
        "task": "spore.purge_audit_logs",
        "schedule": 24 * 60 * 60,
        "args": (SPORE_AUDIT_RETENTION_DAYS,),
    },
}

# ── Email (Resend) ────────────────────────────────────────────────────────────

RESEND_API_KEY = config("RESEND_API_KEY", default="")
EMAIL_FROM_NAME = config("EMAIL_FROM_NAME", default="AI(r)Drop")
EMAIL_FROM_ADDRESS = config("EMAIL_FROM_ADDRESS", default="hello@airdrop.works")
DEFAULT_FROM_EMAIL = f"{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>"

# ── Third-Party API Keys ──────────────────────────────────────────────────────

AI_CORE_MODE = config("AI_CORE_MODE", default="local")
AI_CORE_API_BASE_URL = config("AI_CORE_API_BASE_URL", default="")
AI_CORE_TIMEOUT_SECONDS = config("AI_CORE_TIMEOUT_SECONDS", default=15, cast=int)

ANTHROPIC_API_KEY = config("ANTHROPIC_API_KEY", default="")
TWITTER_CLIENT_ID = config("TWITTER_CLIENT_ID", default="")
TWITTER_CLIENT_SECRET = config("TWITTER_CLIENT_SECRET", default="")
TWITTER_BEARER_TOKEN = config("TWITTER_BEARER_TOKEN", default="")
TWITTER_MAX_RESULTS = config("TWITTER_MAX_RESULTS", default=20, cast=int)

REDDIT_CLIENT_ID = config("REDDIT_CLIENT_ID", default="")
REDDIT_CLIENT_SECRET = config("REDDIT_CLIENT_SECRET", default="")
REDDIT_USER_AGENT = config("REDDIT_USER_AGENT", default="")
REDDIT_MAX_RESULTS = config("REDDIT_MAX_RESULTS", default=25, cast=int)

DISCORD_BOT_TOKEN = config("DISCORD_BOT_TOKEN", default="")
DISCORD_CHANNEL_IDS = config(
    "DISCORD_CHANNEL_IDS",
    default="",
    cast=lambda value: [v.strip() for v in value.split(",") if v.strip()],
)
DISCORD_MAX_MESSAGES = config("DISCORD_MAX_MESSAGES", default=25, cast=int)

TELEGRAM_BOT_TOKEN = config("TELEGRAM_BOT_TOKEN", default="")
TELEGRAM_CHAT_IDS = config(
    "TELEGRAM_CHAT_IDS",
    default="",
    cast=lambda value: [v.strip() for v in value.split(",") if v.strip()],
)
TELEGRAM_MAX_MESSAGES = config("TELEGRAM_MAX_MESSAGES", default=25, cast=int)

SPORE_QDRANT_ENABLED = config("SPORE_QDRANT_ENABLED", default=False, cast=bool)
SPORE_QDRANT_URL = config("SPORE_QDRANT_URL", default="http://localhost:6333")
SPORE_QDRANT_COLLECTION = config("SPORE_QDRANT_COLLECTION", default="spore_nodes")
SPORE_QDRANT_TIMEOUT_SECONDS = config("SPORE_QDRANT_TIMEOUT_SECONDS", default=5, cast=int)
SPORE_ACTIVATION_TTL_SECONDS = config("SPORE_ACTIVATION_TTL_SECONDS", default=900, cast=int)
SPORE_ENABLE_PHASE3 = config("SPORE_ENABLE_PHASE3", default=False, cast=bool)
SPORE_NEO4J_ENABLED = config("SPORE_NEO4J_ENABLED", default=False, cast=bool)
SPORE_NEO4J_URI = config("SPORE_NEO4J_URI", default="bolt://localhost:7687")
SPORE_NEO4J_USER = config("SPORE_NEO4J_USER", default="neo4j")
SPORE_NEO4J_PASSWORD = config("SPORE_NEO4J_PASSWORD", default="")
SPORE_NEO4J_DATABASE = config("SPORE_NEO4J_DATABASE", default="neo4j")

DYNAMIC_API_KEY = config("DYNAMIC_API_KEY", default="")
STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")
STRIPE_PRICE_STARTER = config("STRIPE_PRICE_STARTER", default="")
STRIPE_PRICE_GROWTH = config("STRIPE_PRICE_GROWTH", default="")
STRIPE_PRICE_ENTERPRISE = config("STRIPE_PRICE_ENTERPRISE", default="")
STRIPE_PRICE_USER_PRO = config("STRIPE_PRICE_USER_PRO", default="")
STRIPE_PRICE_USER_TEAM = config("STRIPE_PRICE_USER_TEAM", default="")
STRIPE_PRICE_CREDIT_50 = config("STRIPE_PRICE_CREDIT_50", default="")
STRIPE_PRICE_CREDIT_200 = config("STRIPE_PRICE_CREDIT_200", default="")
STRIPE_SUCCESS_URL = config("STRIPE_SUCCESS_URL", default="http://localhost:3000/settings?billing=success")
STRIPE_CANCEL_URL = config("STRIPE_CANCEL_URL", default="http://localhost:3000/settings?billing=cancelled")

# ── Sentry ────────────────────────────────────────────────────────────────────

SENTRY_DSN = config("SENTRY_DSN", default="")

if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration(), RedisIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
