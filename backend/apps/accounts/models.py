"""Custom User model — Web3-first identity via wallet address."""
from django.contrib.auth.models import AbstractUser
from django.db import models

from common.models import BaseModel


class User(AbstractUser, BaseModel):
    """
    AI(r)Drop user. Primary identity is wallet_address.
    Email is optional (used for waitlist notifications).
    username is kept from AbstractUser for Django admin compatibility.
    """

    wallet_address = models.CharField(
        max_length=42,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="EVM wallet address (0x...). Primary identity for Web3 users.",
    )
    email = models.EmailField(
        unique=True,
        null=True,
        blank=True,
        help_text="Optional. Used for waitlist notifications.",
    )
    dynamic_user_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Dynamic.xyz user ID for wallet auth.",
    )
    avatar_url = models.URLField(blank=True, default="")
    display_name = models.CharField(max_length=64, blank=True, default="")

    USERNAME_FIELD = "wallet_address"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        if self.display_name:
            return self.display_name
        if self.wallet_address:
            return f"{self.wallet_address[:6]}...{self.wallet_address[-4:]}"
        return self.username or str(self.id)

    @property
    def short_address(self) -> str:
        if not self.wallet_address:
            return ""
        return f"{self.wallet_address[:6]}...{self.wallet_address[-4:]}"


class TwitterConnection(BaseModel):
    """OAuth-linked X/Twitter account for login and tweet watch."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="twitter_connection",
    )
    twitter_user_id = models.CharField(max_length=64, unique=True, db_index=True)
    twitter_username = models.CharField(max_length=32, db_index=True)
    display_name = models.CharField(max_length=64, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    access_token = models.TextField()
    refresh_token = models.TextField(blank=True, default="")
    token_expires_at = models.DateTimeField(null=True, blank=True)
    watch_enabled = models.BooleanField(default=True)
    use_selenium_fallback = models.BooleanField(
        default=False,
        help_text="When true and API poll fails, attempt Selenium scrape (dev only).",
    )
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "twitter_connections"

    def __str__(self) -> str:
        return f"@{self.twitter_username}"
