from django.conf import settings
from django.db import models

from common.models import BaseModel


class UserSocialAccount(BaseModel):
    """
    Linked social accounts for multi-platform contribution tracking.
    Users connect Telegram, Discord, Twitter, etc. to earn points from their activity.
    """

    PLATFORM_CHOICES = [
        ("twitter", "Twitter / X"),
        ("discord", "Discord"),
        ("telegram", "Telegram"),
        ("github", "GitHub"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_accounts",
    )
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, db_index=True)
    external_id = models.CharField(max_length=128, help_text="Platform-specific user ID")
    username = models.CharField(max_length=128, blank=True, default="")
    display_name = models.CharField(max_length=128, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    access_token = models.TextField(blank=True, default="")  # encrypted in production
    connected_at = models.DateTimeField(auto_now_add=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "platform", "external_id")
        indexes = [
            models.Index(fields=["platform"]),
            models.Index(fields=["user", "platform"]),
        ]

    def __str__(self):
        owner = self.user.short_address or str(self.user_id)
        return f"{owner} - {self.platform} (@{self.username})"
