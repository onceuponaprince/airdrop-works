"""Integrity domain models — score appeals (Phase 5 Wave 2)."""

from django.conf import settings
from django.db import models

from common.models import BaseModel

APPEAL_STATUS_CHOICES = [
    ("pending", "Pending"),
    ("upheld", "Upheld"),
    ("rejected", "Rejected"),
]

APPEAL_SUBJECT_CHOICES = [
    ("contribution", "Contribution score"),
    ("account", "Account farming flag"),
]


class ScoreAppeal(BaseModel):
    """User dispute of a farming flag or contribution score."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="score_appeals",
    )
    contribution = models.ForeignKey(
        "contributions.Contribution",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="appeals",
    )
    subject = models.CharField(max_length=16, choices=APPEAL_SUBJECT_CHOICES, default="contribution")
    reason = models.TextField()
    status = models.CharField(
        max_length=16,
        choices=APPEAL_STATUS_CHOICES,
        default="pending",
        db_index=True,
    )
    snapshot_farming_flag = models.CharField(max_length=16, blank=True, default="")
    snapshot_composite_score = models.IntegerField(null=True, blank=True)
    resolution_note = models.TextField(blank=True, default="")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_score_appeals",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "integrity_score_appeals"
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"ScoreAppeal({self.id}, {self.status}, user={self.user_id})"
