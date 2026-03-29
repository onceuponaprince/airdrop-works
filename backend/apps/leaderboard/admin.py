from django.contrib import admin
from .models import LeaderboardEntry


@admin.register(LeaderboardEntry)
class LeaderboardEntryAdmin(admin.ModelAdmin):
    list_display = ["rank", "user", "scope", "period", "xp", "snapshot_at"]
    list_filter = ["scope", "period"]
    search_fields = ["user__wallet_address"]
    readonly_fields = ["snapshot_at"]
