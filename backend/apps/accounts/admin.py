from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import DiscordConnection, TelegramConnection, TwitterConnection, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "wallet_address", "email", "display_name", "is_active", "created_at"]
    list_filter = ["is_active", "is_staff", "created_at"]
    search_fields = ["username", "wallet_address", "email", "display_name"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]

    fieldsets = (
        (None, {"fields": ("id", "username", "password")}),
        ("Personal", {"fields": ("email", "display_name", "avatar_url")}),
        ("Web3", {"fields": ("wallet_address", "dynamic_user_id")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_login")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "wallet_address", "password1", "password2"),
        }),
    )


@admin.register(TwitterConnection)
class TwitterConnectionAdmin(admin.ModelAdmin):
    list_display = ["twitter_username", "user", "watch_enabled", "last_synced_at", "last_error"]
    search_fields = ["twitter_username", "twitter_user_id", "user__wallet_address", "user__username"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(DiscordConnection)
class DiscordConnectionAdmin(admin.ModelAdmin):
    list_display = ["discord_username", "user", "last_synced_at", "last_error"]
    search_fields = ["discord_username", "discord_user_id", "user__wallet_address", "user__username"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(TelegramConnection)
class TelegramConnectionAdmin(admin.ModelAdmin):
    list_display = ["telegram_username", "user", "last_synced_at", "last_error"]
    search_fields = ["telegram_username", "telegram_user_id", "user__wallet_address", "user__username"]
    readonly_fields = ["id", "created_at", "updated_at"]
