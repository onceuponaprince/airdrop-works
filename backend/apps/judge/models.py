"""AI Judge models — rubrics and cached scoring results."""
from django.db import models
from common.models import BaseModel


class ScoringRubric(BaseModel):
    """
    Configurable scoring rubric per campaign/quest.
    Weights must sum to 1.0. Default is equal weighting.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    teaching_value_weight = models.FloatField(default=0.333)
    originality_weight = models.FloatField(default=0.333)
    community_impact_weight = models.FloatField(default=0.334)
    custom_instructions = models.TextField(
        blank=True,
        help_text="Additional instructions appended to the base AI Judge prompt.",
    )
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "scoring_rubrics"

    def __str__(self):
        return self.name


class JudgeCache(BaseModel):
    """
    Cached AI Judge result keyed by content hash.
    Identical content always returns the same score.
    """
    content_hash = models.CharField(max_length=64, unique=True, db_index=True)
    content_text = models.TextField()
    teaching_value = models.IntegerField()
    originality = models.IntegerField()
    community_impact = models.IntegerField()
    composite_score = models.IntegerField()
    farming_flag = models.CharField(
        max_length=16,
        choices=[("genuine", "Genuine"), ("farming", "Farming"), ("ambiguous", "Ambiguous")],
    )
    farming_explanation = models.TextField()
    dimension_explanations = models.JSONField(default=dict)
    model_used = models.CharField(max_length=64, default="claude-sonnet-4-20250514")
    rubric = models.ForeignKey(
        ScoringRubric, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        db_table = "judge_cache"

    def __str__(self):
        return f"Score {self.composite_score} [{self.farming_flag}] — {self.content_hash[:8]}"
