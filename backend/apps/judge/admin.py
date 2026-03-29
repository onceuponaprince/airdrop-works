from django.contrib import admin
from .models import ScoringRubric, JudgeCache


@admin.register(ScoringRubric)
class ScoringRubricAdmin(admin.ModelAdmin):
    list_display = ["name", "teaching_value_weight", "originality_weight", "community_impact_weight", "is_default"]
    list_filter = ["is_default"]


@admin.register(JudgeCache)
class JudgeCacheAdmin(admin.ModelAdmin):
    list_display = ["content_hash", "composite_score", "farming_flag", "model_used", "created_at"]
    list_filter = ["farming_flag", "model_used"]
    search_fields = ["content_hash", "content_text"]
    readonly_fields = ["content_hash", "created_at", "updated_at"]
