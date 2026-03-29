"""Loot, badges, and InnovatorToken reward models."""
from django.db import models
from django.conf import settings
from common.models import BaseModel

RARITY_CHOICES = [
    ("common", "Common"),
    ("uncommon", "Uncommon"),
    ("rare", "Rare"),
    ("epic", "Epic"),
    ("legendary", "Legendary"),
]

LOOT_TYPE_CHOICES = [
    ("badge", "Badge NFT"),
    ("innovator_token", "InnovatorToken"),
    ("multiplier", "XP Multiplier"),
]

CHAIN_CHOICES = [("avalanche", "Avalanche"), ("base", "Base"), ("solana", "Solana")]


class Badge(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField()
    image_url = models.URLField()
    rarity = models.CharField(max_length=16, choices=RARITY_CHOICES, db_index=True)
    chain = models.CharField(max_length=16, choices=CHAIN_CHOICES, default="avalanche")
    contract_address = models.CharField(max_length=42, blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "badges"

    def __str__(self):
        return f"{self.name} [{self.rarity}]"


class UserBadge(BaseModel):
    """Junction: a Badge awarded to a User."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_badges"
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="user_badges")
    nft_token_id = models.CharField(max_length=255, blank=True, default="")
    minted = models.BooleanField(default=False)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_badges"
        unique_together = [["user", "badge"]]

    def __str__(self):
        return f"{self.user} earned {self.badge.name}"


class LootChest(BaseModel):
    """A loot chest awarded to a user. Contains one item revealed on open."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="loot_chests"
    )
    rarity = models.CharField(max_length=16, choices=RARITY_CHOICES, db_index=True)
    loot_type = models.CharField(max_length=32, choices=LOOT_TYPE_CHOICES, null=True, blank=True)
    loot_name = models.CharField(max_length=255, blank=True, default="")
    loot_description = models.TextField(blank=True, default="")
    loot_amount = models.IntegerField(null=True, blank=True)
    opened = models.BooleanField(default=False, db_index=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(
        max_length=64, blank=True, default="",
        help_text="e.g. 'quest_completion', 'milestone', 'daily'"
    )

    class Meta:
        db_table = "loot_chests"

    def __str__(self):
        status = "opened" if self.opened else "unopened"
        return f"{self.rarity} chest [{status}] — {self.user}"
