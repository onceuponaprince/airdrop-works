"""LLM quota guard for AI Judge and AI core scoring."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from django.conf import settings
from django.core.cache import cache

from apps.ai_core.metrics import record_llm_budget_warning, record_llm_rate_limited


@dataclass(frozen=True)
class LLMQuota:
    scope: str
    scope_id: str
    per_minute: int
    daily_limit: int
    warn_at_percent: int

    @property
    def key_prefix(self) -> str:
        return f"llm:{self.scope}:{self.scope_id}"


def _utc_day() -> str:
    return datetime.now(UTC).strftime("%Y%m%d")


def _key_for_today(prefix: str) -> str:
    return f"{prefix}:daily:{_utc_day()}"


def _bucket_for_minute(prefix: str) -> str:
    return f"{prefix}:minute:{int(datetime.now(UTC).timestamp() // 60)}"


def _quota_from_metadata(metadata: dict[str, Any] | None) -> tuple[int | None, int | None, int | None]:
    data = (metadata or {}).get("ai_llm_budget") or {}
    return (
        data.get("per_minute"),
        data.get("daily_limit"),
        data.get("warn_at_percent"),
    )


def _resolve_quota(*, user=None, tenant=None) -> LLMQuota:
    per_minute = settings.AI_LLM_RATE_PER_MINUTE
    daily_limit = settings.AI_LLM_DAILY_LIMIT
    warn_at_percent = settings.AI_LLM_WARN_AT_PERCENT
    scope = "global"
    scope_id = "default"

    if tenant is not None:
        tenant_pm, tenant_daily, tenant_warn = _quota_from_metadata(getattr(tenant, "metadata", None))
        if tenant_pm is not None:
            per_minute = int(tenant_pm)
        if tenant_daily is not None:
            daily_limit = int(tenant_daily)
        if tenant_warn is not None:
            warn_at_percent = int(tenant_warn)
        scope = "tenant"
        scope_id = str(getattr(tenant, "id", "tenant"))

    if user is not None:
        from apps.payments.models import UserSubscription

        user_sub = None
        try:
            user_sub = getattr(user, "user_subscription", None)
        except Exception:
            user_sub = None
        if user_sub is None and hasattr(user, "_meta"):
            user_id = getattr(user, "pk", None) or getattr(user, "id", None)
            if user_id is not None:
                user_sub = UserSubscription.objects.filter(user_id=user_id).first()
        user_pm, user_daily, user_warn = _quota_from_metadata(getattr(user_sub, "metadata", None))
        if user_pm is not None:
            per_minute = int(user_pm)
        if user_daily is not None:
            daily_limit = int(user_daily)
        if user_warn is not None:
            warn_at_percent = int(user_warn)
        scope = "user"
        scope_id = str(getattr(user, "id", "user"))

    return LLMQuota(
        scope=scope,
        scope_id=scope_id,
        per_minute=max(1, int(per_minute)),
        daily_limit=max(1, int(daily_limit)),
        warn_at_percent=max(1, int(warn_at_percent)),
    )


def _current_count(cache_key: str, ttl_seconds: int) -> int:
    if cache.add(cache_key, 0, timeout=ttl_seconds):
        return 0
    value = cache.get(cache_key, 0)
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _increment(cache_key: str, ttl_seconds: int) -> int:
    if cache.add(cache_key, 0, timeout=ttl_seconds):
        return cache.incr(cache_key)
    try:
        return cache.incr(cache_key)
    except ValueError:
        cache.set(cache_key, 1, timeout=ttl_seconds)
        return 1


def reserve_llm_call(*, user=None, tenant=None, weight: int = 1) -> bool:
    """Reserve a unit of LLM budget for the supplied scope.

    If a tenant or user budget exists in metadata, it wins over the global
    default. Each call is counted in the applicable scope and the global scope
    so we can alert on system-wide pressure as well.
    """
    quota = _resolve_quota(user=user, tenant=tenant)
    scopes = [LLMQuota("global", "default", settings.AI_LLM_RATE_PER_MINUTE, settings.AI_LLM_DAILY_LIMIT, settings.AI_LLM_WARN_AT_PERCENT)]
    if quota.scope != "global":
        scopes.append(quota)

    minute_keys = []
    daily_keys = []
    for scope in scopes:
        minute_keys.append((_bucket_for_minute(scope.key_prefix), 90, scope.per_minute))
        daily_keys.append((_key_for_today(scope.key_prefix), 60 * 60 * 26, scope.daily_limit))

    for cache_key, ttl, limit in minute_keys + daily_keys:
        current = _current_count(cache_key, ttl)
        if current + weight > limit:
            record_llm_rate_limited(scope=quota.scope, scope_id=quota.scope_id)
            return False

    for cache_key, ttl, limit in minute_keys + daily_keys:
        new_value = _increment(cache_key, ttl)
        if new_value >= int(limit * (quota.warn_at_percent / 100)):
            record_llm_budget_warning(scope=quota.scope, scope_id=quota.scope_id)

    return True


def quota_context_from_request(request=None, *, tenant=None) -> dict[str, Any]:
    context: dict[str, Any] = {}
    if request is not None and getattr(request, "user", None) is not None:
        context["user"] = request.user
    if tenant is not None:
        context["tenant"] = tenant
    return context
