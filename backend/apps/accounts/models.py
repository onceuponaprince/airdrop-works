from django.contrib.auth.models import AbstractUser
from django.db import models

from common.models import BaseModel


class User(AbstractUser, BaseModel):
    """Application user keyed primarily by wallet address."""

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

    @property
    def short_address(self) -> str:
        if not self.wallet_address:
            return ""
        return f"{self.wallet_address[:6]}...{self.wallet_address[-4:]}"

    def __str__(self):
        return self.display_name or self.wallet_address or self.username or str(self.id)


class TwitterConnection(BaseModel):
    """Linked Twitter/X account for OAuth-based timeline tracking."""

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
        help_text="Use local browser automation fallback if API access is unavailable.",
    )
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "twitter_connections"

    def __str__(self):
        owner = self.user.short_address or str(self.user_id)
        return f"{owner} - Twitter @{self.twitter_username}"


class DiscordConnection(BaseModel):
    """Linked Discord account and channel tracking preferences."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="discord_connection",
    )
    discord_user_id = models.CharField(max_length=64, unique=True, db_index=True)
    discord_username = models.CharField(max_length=64, db_index=True)
    display_name = models.CharField(max_length=128, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    access_token = models.TextField(blank=True, default="")
    refresh_token = models.TextField(blank=True, default="")
    token_expires_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "discord_connections"

    def __str__(self):
        owner = self.user.short_address or str(self.user_id)
        return f"{owner} - Discord @{self.discord_username}"


class TelegramConnection(BaseModel):
    """Linked Telegram account for message tracking via bot deep link."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="telegram_connection",
    )
    telegram_user_id = models.CharField(max_length=64, unique=True, db_index=True)
    telegram_username = models.CharField(max_length=32, db_index=True)
    display_name = models.CharField(max_length=64, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    access_token = models.TextField(blank=True, default="")
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "telegram_connections"

    def __str__(self):
        owner = self.user.short_address or str(self.user_id)
        return f"{owner} - Telegram @{self.telegram_username}"
