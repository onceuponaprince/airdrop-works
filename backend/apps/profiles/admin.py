from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "total_xp", "rank", "primary_branch", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__wallet_address"]
    readonly_fields = ["id", "primary_branch", "created_at", "updated_at"]
    raw_id_fields = ["user"]
