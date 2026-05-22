from django.db import models
from django.conf import settings
from common.models import BaseModel


class Referral(BaseModel):
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referrals_made",
    )
    referred = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="referred_by",
    )
    code = models.CharField(max_length=12, unique=True)
    converted_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=32, default="waitlist")  # waitlist | inapp | share

    class Meta:
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["referrer"]),
        ]

    def __str__(self):
        return f"{self.code} -> {self.referrer.wallet_address[:6]}..."