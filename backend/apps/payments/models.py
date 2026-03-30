from django.conf import settings
from django.db import models

from apps.spore.models import Tenant
from common.models import BaseModel

# ── Tenant subscription (existing SPORE billing) ─────────────────────────────

PLAN_CHOICES = [
    ("starter", "Starter — $99/mo"),
    ("growth", "Growth — $499/mo"),
    ("enterprise", "Enterprise — Custom"),
]

STATUS_CHOICES = [
    ("active", "Active"),
    ("cancelled", "Cancelled"),
    ("past_due", "Past Due"),
    ("trialing", "Trialing"),
    ("incomplete", "Incomplete"),
]


class Subscription(BaseModel):
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="subscription",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="subscriptions",
        null=True,
        blank=True,
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_subscription_item_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_price_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_latest_event_id = models.CharField(max_length=255, blank=True, db_index=True)
    plan = models.CharField(max_length=16, choices=PLAN_CHOICES)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="trialing")
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = "subscriptions"
        indexes = [
            models.Index(fields=["plan", "status"]),
        ]

    def __str__(self):
        subject = self.tenant.slug if self.tenant_id else self.user_id
        return f"{subject} — {self.plan} [{self.status}]"


# ── Per-user AI Judge subscription + credits ──────────────────────────────────

USER_PLAN_CHOICES = [
    ("free", "Free"),
    ("pro", "Pro — $29/mo"),
    ("team", "Team — $99/mo"),
]

USER_PLAN_CREDITS = {
    "free": 10,
    "pro": 200,
    "team": 1000,
}

CREDIT_PACK_CHOICES = {
    "50": {"credits": 50, "label": "50 credits", "cents": 900},
    "200": {"credits": 200, "label": "200 credits", "cents": 2900},
}


class UserSubscription(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_subscription",
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    stripe_price_id = models.CharField(max_length=255, blank=True)
    plan = models.CharField(max_length=16, choices=USER_PLAN_CHOICES, default="free")
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="active")
    monthly_credits = models.IntegerField(default=10)
    credits_remaining = models.IntegerField(default=10)
    credits_reset_at = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)

    class Meta:
        db_table = "user_subscriptions"

    def __str__(self):
        return f"{self.user} — {self.plan} [{self.credits_remaining}/{self.monthly_credits}]"


class CreditTransaction(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_transactions",
    )
    amount = models.IntegerField()
    reason = models.CharField(max_length=64)
    balance_after = models.IntegerField()

    class Meta:
        db_table = "credit_transactions"

    def __str__(self):
        sign = "+" if self.amount > 0 else ""
        return f"{self.user} {sign}{self.amount} ({self.reason}) → {self.balance_after}"
