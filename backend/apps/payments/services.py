from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import stripe
from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import ValidationError as DRFValidationError

from apps.payments.models import (
    CREDIT_PACK_CHOICES,
    USER_PLAN_CREDITS,
    CreditTransaction,
    Subscription,
    UserSubscription,
)
from apps.spore.models import Tenant

PLAN_QUOTAS: dict[str, dict[str, int]] = {
    "starter": {
        "quota_daily_query": 1000,
        "quota_daily_ingest": 500,
        "quota_daily_relationship": 1000,
        "quota_daily_brief_generate": 200,
    },
    "growth": {
        "quota_daily_query": 10000,
        "quota_daily_ingest": 5000,
        "quota_daily_relationship": 10000,
        "quota_daily_brief_generate": 1500,
    },
    "enterprise": {
        "quota_daily_query": 50000,
        "quota_daily_ingest": 25000,
        "quota_daily_relationship": 50000,
        "quota_daily_brief_generate": 5000,
    },
}


def configure_stripe() -> None:
    stripe.api_key = settings.STRIPE_SECRET_KEY


def get_price_id_for_plan(plan: str) -> str:
    price_map = {
        "starter": settings.STRIPE_PRICE_STARTER,
        "growth": settings.STRIPE_PRICE_GROWTH,
        "enterprise": settings.STRIPE_PRICE_ENTERPRISE,
    }
    return price_map.get(plan, "")


def get_plan_for_price_id(price_id: str) -> str | None:
    price_to_plan = {
        settings.STRIPE_PRICE_STARTER: "starter",
        settings.STRIPE_PRICE_GROWTH: "growth",
        settings.STRIPE_PRICE_ENTERPRISE: "enterprise",
    }
    return price_to_plan.get(price_id)


def apply_plan_to_tenant(tenant: Tenant, plan: str, billing_status: str) -> Tenant:
    quotas = PLAN_QUOTAS.get(plan, PLAN_QUOTAS["starter"])
    tenant.plan = plan
    tenant.quota_daily_query = quotas["quota_daily_query"]
    tenant.quota_daily_ingest = quotas["quota_daily_ingest"]
    tenant.quota_daily_relationship = quotas["quota_daily_relationship"]
    tenant.quota_daily_brief_generate = quotas["quota_daily_brief_generate"]
    tenant.metadata = {
        **(tenant.metadata or {}),
        "billing_status": billing_status,
    }
    tenant.save(
        update_fields=[
            "plan",
            "quota_daily_query",
            "quota_daily_ingest",
            "quota_daily_relationship",
            "quota_daily_brief_generate",
            "metadata",
            "updated_at",
        ]
    )
    return tenant


def tenant_plan_for_status(plan: str, status: str) -> str:
    if status in {"active", "trialing"}:
        return plan
    return "starter"


def ensure_stripe_customer(subscription: Subscription, tenant: Tenant, user) -> str:
    configure_stripe()
    if subscription.stripe_customer_id:
        return subscription.stripe_customer_id

    customer = stripe.Customer.create(
        email=getattr(user, "email", "") or None,
        metadata={
            "tenant_id": str(tenant.id),
            "tenant_slug": tenant.slug,
            "user_id": str(user.id),
        },
        name=tenant.name,
    )
    subscription.stripe_customer_id = customer["id"]
    subscription.save(update_fields=["stripe_customer_id", "updated_at"])
    return subscription.stripe_customer_id


def upsert_subscription(
    *,
    tenant: Tenant,
    user,
    plan: str,
    status: str,
    stripe_customer_id: str = "",
    stripe_subscription_id: str = "",
    stripe_subscription_item_id: str = "",
    stripe_checkout_session_id: str = "",
    stripe_price_id: str = "",
    stripe_latest_event_id: str = "",
    current_period_start=None,
    current_period_end=None,
    cancel_at_period_end: bool = False,
    metadata: dict[str, Any] | None = None,
) -> Subscription:
    subscription, _ = Subscription.objects.update_or_create(
        tenant=tenant,
        defaults={
            "user": user,
            "plan": plan,
            "status": status,
            "stripe_customer_id": stripe_customer_id,
            "stripe_subscription_id": stripe_subscription_id,
            "stripe_subscription_item_id": stripe_subscription_item_id,
            "stripe_checkout_session_id": stripe_checkout_session_id,
            "stripe_price_id": stripe_price_id,
            "stripe_latest_event_id": stripe_latest_event_id,
            "current_period_start": current_period_start,
            "current_period_end": current_period_end,
            "cancel_at_period_end": cancel_at_period_end,
            "metadata": metadata or {},
        },
    )
    return subscription


def timestamp_to_datetime(value):
    if not value:
        return None
    return datetime.fromtimestamp(int(value), tz=UTC)


def resolve_tenant_from_metadata(metadata: dict[str, Any] | None = None) -> Tenant | None:
    metadata = metadata or {}
    tenant_id = str(metadata.get("tenant_id", "")).strip()
    tenant_slug = str(metadata.get("tenant_slug", "")).strip()
    if tenant_id:
        tenant = Tenant.objects.filter(id=tenant_id).first()
        if tenant:
            return tenant
    if tenant_slug:
        return Tenant.objects.filter(slug=tenant_slug).first()
    return None


def sync_subscription_from_checkout_session(session: dict[str, Any], event_id: str = "") -> Subscription | None:
    tenant = resolve_tenant_from_metadata(session.get("metadata"))
    if not tenant:
        return None

    plan = str(session.get("metadata", {}).get("plan", tenant.plan or "starter"))
    status = "trialing"
    apply_plan_to_tenant(tenant, tenant_plan_for_status(plan, status), status)
    return upsert_subscription(
        tenant=tenant,
        user=tenant.memberships.select_related("user").filter(role="owner", is_active=True).first().user
        if tenant.memberships.filter(role="owner", is_active=True).exists()
        else None,
        plan=plan,
        status=status,
        stripe_customer_id=str(session.get("customer", "")),
        stripe_subscription_id=str(session.get("subscription", "")),
        stripe_checkout_session_id=str(session.get("id", "")),
        stripe_latest_event_id=event_id,
        metadata=session.get("metadata") or {},
    )


def sync_subscription_from_subscription_payload(
    payload: dict[str, Any],
    *,
    event_id: str = "",
    explicit_status: str | None = None,
) -> Subscription | None:
    tenant = resolve_tenant_from_metadata(payload.get("metadata"))
    subscription = None
    if not tenant:
        subscription = Subscription.objects.filter(
            stripe_subscription_id=str(payload.get("id", "")),
        ).select_related("tenant").first()
        if subscription:
            tenant = subscription.tenant
    if not tenant:
        subscription = Subscription.objects.filter(
            stripe_customer_id=str(payload.get("customer", "")),
        ).select_related("tenant").first()
        if subscription:
            tenant = subscription.tenant
    if not tenant:
        return None

    items = payload.get("items", {}).get("data", [])
    first_item = items[0] if items else {}
    price_id = str(first_item.get("price", {}).get("id", ""))
    plan = get_plan_for_price_id(price_id) or tenant.plan or "starter"
    status = explicit_status or str(payload.get("status", "trialing"))
    runtime_plan = tenant_plan_for_status(plan, status)
    apply_plan_to_tenant(tenant, runtime_plan, status)

    owner_membership = tenant.memberships.select_related("user").filter(role="owner", is_active=True).first()
    owner = owner_membership.user if owner_membership else None
    return upsert_subscription(
        tenant=tenant,
        user=owner,
        plan=plan,
        status=status,
        stripe_customer_id=str(payload.get("customer", "")),
        stripe_subscription_id=str(payload.get("id", "")),
        stripe_subscription_item_id=str(first_item.get("id", "")),
        stripe_price_id=price_id,
        stripe_latest_event_id=event_id,
        current_period_start=timestamp_to_datetime(payload.get("current_period_start")),
        current_period_end=timestamp_to_datetime(payload.get("current_period_end")),
        cancel_at_period_end=bool(payload.get("cancel_at_period_end", False)),
        metadata=payload.get("metadata") or {},
    )


# ── Per-user credit system ────────────────────────────────────────────────────


def get_or_create_user_sub(user) -> UserSubscription:
    sub, _ = UserSubscription.objects.get_or_create(user=user)
    return sub


def deduct_credit(user, reason: str, amount: int = 1) -> int:
    """Atomically deduct credits. Returns remaining balance or raises."""
    with transaction.atomic():
        sub = UserSubscription.objects.select_for_update().get(user=user)
        if sub.credits_remaining < amount:
            raise DRFValidationError(
                {"detail": "Insufficient credits", "credits_remaining": sub.credits_remaining}
            )
        sub.credits_remaining -= amount
        sub.save(update_fields=["credits_remaining", "updated_at"])
        CreditTransaction.objects.create(
            user=user,
            amount=-amount,
            reason=reason,
            balance_after=sub.credits_remaining,
        )
    return sub.credits_remaining


def add_credits(user, amount: int, reason: str) -> int:
    with transaction.atomic():
        sub = UserSubscription.objects.select_for_update().get(user=user)
        sub.credits_remaining += amount
        sub.save(update_fields=["credits_remaining", "updated_at"])
        CreditTransaction.objects.create(
            user=user,
            amount=amount,
            reason=reason,
            balance_after=sub.credits_remaining,
        )
    return sub.credits_remaining


def get_user_plan_price_id(plan: str) -> str:
    return {
        "pro": settings.STRIPE_PRICE_USER_PRO,
        "team": settings.STRIPE_PRICE_USER_TEAM,
    }.get(plan, "")


def get_credit_pack_price_id(pack: str) -> str:
    return {
        "50": settings.STRIPE_PRICE_CREDIT_50,
        "200": settings.STRIPE_PRICE_CREDIT_200,
    }.get(pack, "")


def ensure_user_stripe_customer(sub: UserSubscription, user) -> str:
    configure_stripe()
    if sub.stripe_customer_id:
        return sub.stripe_customer_id
    customer = stripe.Customer.create(
        email=getattr(user, "email", "") or None,
        metadata={"user_id": str(user.id), "type": "user_subscription"},
    )
    sub.stripe_customer_id = customer["id"]
    sub.save(update_fields=["stripe_customer_id", "updated_at"])
    return sub.stripe_customer_id


def sync_user_subscription_from_webhook(payload: dict[str, Any], event_id: str = "") -> UserSubscription | None:
    """Handle Stripe webhook events for per-user subscriptions."""
    metadata = payload.get("metadata") or {}
    if metadata.get("type") != "user_subscription":
        return None
    user_id = metadata.get("user_id")
    if not user_id:
        return None

    try:
        sub = UserSubscription.objects.get(user_id=user_id)
    except UserSubscription.DoesNotExist:
        return None

    items = payload.get("items", {}).get("data", [])
    first_item = items[0] if items else {}
    price_id = str(first_item.get("price", {}).get("id", ""))

    plan_map = {
        settings.STRIPE_PRICE_USER_PRO: "pro",
        settings.STRIPE_PRICE_USER_TEAM: "team",
    }
    plan = plan_map.get(price_id, sub.plan)
    sub_status = str(payload.get("status", sub.status))

    sub.plan = plan
    sub.status = sub_status
    sub.stripe_subscription_id = str(payload.get("id", sub.stripe_subscription_id))
    sub.stripe_price_id = price_id or sub.stripe_price_id
    sub.monthly_credits = USER_PLAN_CREDITS.get(plan, 10)
    sub.current_period_end = timestamp_to_datetime(payload.get("current_period_end"))
    sub.cancel_at_period_end = bool(payload.get("cancel_at_period_end", False))

    if sub_status in {"active", "trialing"}:
        sub.credits_remaining = sub.monthly_credits
    sub.save()
    return sub


def sync_user_credit_pack_from_checkout(session: dict[str, Any]) -> UserSubscription | None:
    """Handle completed checkout for credit packs."""
    metadata = session.get("metadata") or {}
    if metadata.get("type") != "user_credit_pack":
        return None
    user_id = metadata.get("user_id")
    pack_key = metadata.get("credit_pack")
    if not user_id or pack_key not in CREDIT_PACK_CHOICES:
        return None

    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None

    pack = CREDIT_PACK_CHOICES[pack_key]
    add_credits(user, pack["credits"], f"credit_pack_{pack_key}")
    return UserSubscription.objects.get(user=user)
