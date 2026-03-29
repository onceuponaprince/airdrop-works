from django.conf import settings
from django.db import models

from apps.spore.models import Tenant
from common.models import BaseModel

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
