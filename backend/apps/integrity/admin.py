from django.contrib import admin

from .models import ScoreAppeal


@admin.register(ScoreAppeal)
class ScoreAppealAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "subject",
        "status",
        "snapshot_farming_flag",
        "created_at",
        "resolved_at",
    )
    list_filter = ("status", "subject", "created_at")
    search_fields = ("user__wallet_address", "reason", "resolution_note")
    readonly_fields = (
        "created_at",
        "updated_at",
        "snapshot_farming_flag",
        "snapshot_composite_score",
        "resolved_by",
        "resolved_at",
    )
    raw_id_fields = ("user", "contribution", "resolved_by")
