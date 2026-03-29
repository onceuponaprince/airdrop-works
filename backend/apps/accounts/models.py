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
