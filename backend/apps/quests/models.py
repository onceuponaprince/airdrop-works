"""Quest / campaign models."""
from django.db import models
from django.conf import settings
from common.models import BaseModel

DIFFICULTY_CHOICES = [("D", "D"), ("C", "C"), ("B", "B"), ("A", "A"), ("S", "S")]
CHAIN_CHOICES = [("avalanche", "Avalanche"), ("base", "Base"), ("solana", "Solana")]
QUEST_STATUS_CHOICES = [("upcoming", "Upcoming"), ("active", "Active"), ("completed", "Completed")]


class Quest(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField()
    project_name = models.CharField(max_length=255)
    project_logo_url = models.URLField(blank=True, default="")
    difficulty = models.CharField(max_length=1, choices=DIFFICULTY_CHOICES, db_index=True)
    reward_pool = models.DecimalField(max_digits=20, decimal_places=6)
    reward_token = models.CharField(max_length=42, blank=True, default="")
    chain = models.CharField(max_length=16, choices=CHAIN_CHOICES, default="avalanche")
    scoring_rubric = models.JSONField(
        default=dict,
        help_text='{"rubric_id": "<uuid>"} or inline weights.',
    )
    start_date = models.DateTimeField(db_index=True)
    end_date = models.DateTimeField(db_index=True)
    max_participants = models.IntegerField(null=True, blank=True)
    party_size = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=QUEST_STATUS_CHOICES, default="upcoming", db_index=True)

    class Meta:
        db_table = "quests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} [{self.difficulty}] {self.status}"

    @property
    def participant_count(self) -> int:
        return self.acceptances.count()


class QuestAcceptance(BaseModel):
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE, related_name="acceptances")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quest_acceptances")
    status = models.CharField(
        max_length=16,
        choices=[("active", "Active"), ("completed", "Completed"), ("expired", "Expired")],
        default="active",
    )

    class Meta:
        db_table = "quest_acceptances"
        unique_together = [["quest", "user"]]

    def __str__(self):
        return f"{self.user} → {self.quest.title} [{self.status}]"
