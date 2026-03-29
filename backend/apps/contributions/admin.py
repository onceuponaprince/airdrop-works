from django.contrib import admin
from .models import Contribution, CrawlSourceConfig


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ["user", "platform", "total_score", "farming_flag", "xp_awarded", "scored_at"]
    list_filter = ["platform", "farming_flag", "scored_at"]
    search_fields = ["user__wallet_address", "content_text"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["user"]


@admin.register(CrawlSourceConfig)
class CrawlSourceConfigAdmin(admin.ModelAdmin):
    list_display = ["user", "platform", "source_key", "is_active", "cursor", "last_crawled_at"]
    list_filter = ["platform", "is_active"]
    search_fields = ["user__wallet_address", "source_key"]
    readonly_fields = ["id", "created_at", "updated_at", "last_crawled_at", "last_error"]
    raw_id_fields = ["user"]
