"""Contribution model — stores scored social/GitHub contributions."""
from django.db import models
from django.conf import settings
from common.models import BaseModel

PLATFORM_CHOICES = [
    ("twitter", "Twitter/X"),
    ("discord", "Discord"),
    ("telegram", "Telegram"),
    ("reddit", "Reddit"),
    ("github", "GitHub"),
]

CRAWLER_PLATFORM_CHOICES = [
    ("twitter", "Twitter/X"),
    ("discord", "Discord"),
    ("telegram", "Telegram"),
    ("reddit", "Reddit"),
]

FARMING_FLAG_CHOICES = [
    ("genuine", "Genuine"),
    ("farming", "Farming"),
    ("ambiguous", "Ambiguous"),
]

# Maps platform → default skill branch for XP award
PLATFORM_BRANCH_MAP = {
    "twitter": "educator",
    "discord": "diplomat",
    "telegram": "diplomat",
    "reddit": "scout",
    "github": "builder",
}


class Contribution(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contributions",
    )
    platform = models.CharField(max_length=16, choices=PLATFORM_CHOICES, db_index=True)
    content_text = models.TextField()
    content_url = models.URLField(blank=True, default="")
    platform_content_id = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Native ID on the platform (tweet ID, GitHub PR number, etc.)",
    )

    # AI Judge scores
    teaching_value = models.IntegerField(null=True, blank=True)
    originality = models.IntegerField(null=True, blank=True)
    community_impact = models.IntegerField(null=True, blank=True)
    total_score = models.IntegerField(null=True, blank=True, db_index=True)
    farming_flag = models.CharField(
        max_length=16, choices=FARMING_FLAG_CHOICES, null=True, blank=True, db_index=True
    )
    farming_explanation = models.TextField(blank=True, default="")
    dimension_explanations = models.JSONField(default=dict)

    xp_awarded = models.IntegerField(default=0)
    scored_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "contributions"
        unique_together = [["platform", "platform_content_id"]]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["platform", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user} [{self.platform}] score={self.total_score}"

    @property
    def is_scored(self) -> bool:
        return self.scored_at is not None

    @property
    def is_farming(self) -> bool:
        return self.farming_flag == "farming"


class CrawlSourceConfig(BaseModel):
    """Per-user crawler source configuration with incremental cursor state."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="crawl_sources",
    )
    platform = models.CharField(max_length=16, choices=CRAWLER_PLATFORM_CHOICES, db_index=True)
    source_key = models.CharField(
        max_length=255,
        help_text="Twitter username, Discord channel ID, Telegram chat ID, or subreddit name",
    )
    is_active = models.BooleanField(default=True)
    cursor = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Incremental cursor (latest seen message ID) for this source",
    )
    last_crawled_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = "contribution_crawl_source_configs"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "platform", "source_key"],
                name="uniq_crawl_source_per_user",
            )
        ]
        indexes = [
            models.Index(fields=["platform", "is_active"]),
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.platform}:{self.source_key}"
