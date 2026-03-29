"""Quota enforcement and usage metering for SPORE endpoints."""

from __future__ import annotations

from datetime import date

from django.db.models import F

from apps.spore.models import UsageDailyCounter, UsageEvent

METRIC_TO_TENANT_QUOTA_FIELD = {
    "spore.query": "quota_daily_query",
    "spore.ingest": "quota_daily_ingest",
    "spore.relationship": "quota_daily_relationship",
    "spore.brief_generate": "quota_daily_brief_generate",
}


def enforce_quota_or_raise(tenant, metric: str, units: int = 1):
    quota_field = METRIC_TO_TENANT_QUOTA_FIELD.get(metric)
    if not quota_field:
        return
    quota_limit = int(getattr(tenant, quota_field, 0) or 0)
    if quota_limit <= 0:
        return

    counter, created = UsageDailyCounter.objects.get_or_create(
        tenant=tenant,
        metric=metric,
        day=date.today(),
        defaults={"count": 0},
    )
    if created:
        current = 0
    else:
        current = int(counter.count)
    if current + units > quota_limit:
        raise QuotaExceededError(metric=metric, quota_limit=quota_limit, current=current)

    UsageDailyCounter.objects.filter(id=counter.id).update(count=F("count") + units)


def meter_usage(tenant, user, api_key, metric: str, status_code: int, units: int = 1, metadata=None):
    UsageEvent.objects.create(
        tenant=tenant,
        user=user,
        api_key=api_key,
        metric=metric,
        units=units,
        status_code=status_code,
        metadata=metadata or {},
    )


class QuotaExceededError(Exception):
    def __init__(self, metric: str, quota_limit: int, current: int):
        self.metric = metric
        self.quota_limit = quota_limit
        self.current = current
        super().__init__(f"Quota exceeded for {metric}")

