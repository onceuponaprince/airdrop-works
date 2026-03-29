from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["wallet_address", "email", "display_name", "is_active", "created_at"]
    list_filter = ["is_active", "is_staff", "created_at"]
    search_fields = ["wallet_address", "email", "display_name"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (None, {"fields": ("id", "wallet_address", "username", "password")}),
        ("Personal", {"fields": ("email", "display_name", "avatar_url")}),
        ("Web3", {"fields": ("dynamic_user_id",)}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_login")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("wallet_address", "username", "password1", "password2"),
        }),
    )
