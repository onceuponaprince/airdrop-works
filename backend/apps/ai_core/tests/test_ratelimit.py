from types import SimpleNamespace

import pytest
from django.core.cache import cache
from django.test import override_settings

from apps.ai_core.ratelimit import reserve_llm_call


@pytest.mark.django_db
@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    AI_LLM_RATE_PER_MINUTE=10,
    AI_LLM_DAILY_LIMIT=100,
    AI_LLM_WARN_AT_PERCENT=80,
)
def test_reserve_llm_call_uses_user_budget_over_global():
    cache.clear()
    user = SimpleNamespace(
        id=7,
        user_subscription=SimpleNamespace(
            metadata={"ai_llm_budget": {"per_minute": 1, "daily_limit": 2, "warn_at_percent": 50}}
        ),
    )

    assert reserve_llm_call(user=user) is True
    assert reserve_llm_call(user=user) is False


@pytest.mark.django_db
@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    AI_LLM_RATE_PER_MINUTE=1,
    AI_LLM_DAILY_LIMIT=1,
)
def test_reserve_llm_call_falls_back_to_global_budget_without_user_scope():
    cache.clear()
    assert reserve_llm_call() is True
    assert reserve_llm_call() is False
