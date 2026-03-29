"""Leaderboard — materialised ranking snapshots."""
from django.db import models
from django.conf import settings
from common.models import BaseModel


class LeaderboardEntry(BaseModel):
    """
    Materialised leaderboard row. Rebuilt by Celery beat every 15 minutes.
    Separate table avoids expensive live sorts on the profiles table.
    """
    SCOPE_CHOICES = [
        ("global", "Global"),
        ("educator", "Educator"),
        ("builder", "Builder"),
        ("creator", "Creator"),
        ("scout", "Scout"),
        ("diplomat", "Diplomat"),
    ]
    PERIOD_CHOICES = [
        ("all_time", "All Time"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="leaderboard_entries"
    )
    scope = models.CharField(max_length=16, choices=SCOPE_CHOICES, db_index=True)
    period = models.CharField(max_length=16, choices=PERIOD_CHOICES, db_index=True)
    rank = models.IntegerField(db_index=True)
    xp = models.IntegerField(default=0)
    contribution_count = models.IntegerField(default=0)
    snapshot_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leaderboard_entries"
        unique_together = [["user", "scope", "period"]]
        ordering = ["rank"]

    def __str__(self):
        return f"#{self.rank} {self.user} [{self.scope}/{self.period}] {self.xp}xp"
