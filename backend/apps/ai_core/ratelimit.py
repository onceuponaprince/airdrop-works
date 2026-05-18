"""Simple Redis-backed counters to guard LLM usage.

Provides a lightweight global rate and daily budget guard using Django cache
backend (Redis in production). Uses cache.add/incr for atomic-ish counters.
"""
from __future__ import annotations

import time
from datetime import datetime
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def _today_key() -> str:
    return datetime.utcnow().strftime("%Y%m%d")


def reserve_llm_call() -> bool:
    """Reserve a slot for an LLM call under global rate and daily budgets.

    Returns True if the call is allowed; False if budgets/rate exceeded.
    """
    # Configurable limits (defaults)
    per_minute = getattr(settings, "AI_LLM_RATE_PER_MINUTE", 30)
    daily_limit = getattr(settings, "AI_LLM_DAILY_LIMIT", 10000)

    # Per-minute key
    minute_ts = int(time.time() // 60)
    min_key = f"llm:rate:{minute_ts}"
    # Daily key
    day_key = f"llm:daily:{_today_key()}"

    try:
        # Initialize counters if missing
        cache.add(min_key, 0, timeout=90)  # expire after 90s
        cache.add(day_key, 0, timeout=60 * 60 * 26)  # expire after 26h

        cur_min = cache.incr(min_key)
        cur_day = cache.incr(day_key)

        if cur_min > per_minute:
            logger.warning("LLM per-minute rate exceeded: %s/%s", cur_min, per_minute)
            return False
        if cur_day > daily_limit:
            logger.error("LLM daily limit exceeded: %s/%s", cur_day, daily_limit)
            return False

        return True
    except Exception as e:
        # If cache is unavailable, be conservative and allow the call (fail-open)
        logger.exception("LLM reserve check failed, allowing call by default: %s", e)
        return True
