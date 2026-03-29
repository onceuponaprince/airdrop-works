from django.contrib import admin
from .models import Quest, QuestAcceptance


@admin.register(Quest)
class QuestAdmin(admin.ModelAdmin):
    list_display = ["title", "project_name", "difficulty", "status", "reward_pool", "chain", "end_date"]
    list_filter = ["difficulty", "status", "chain"]
    search_fields = ["title", "project_name"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(QuestAcceptance)
class QuestAcceptanceAdmin(admin.ModelAdmin):
    list_display = ["user", "quest", "status", "created_at"]
    list_filter = ["status"]
    raw_id_fields = ["user", "quest"]
