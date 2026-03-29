from django.contrib import admin
from .models import Badge, UserBadge, LootChest


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ["name", "rarity", "chain", "is_active"]
    list_filter = ["rarity", "chain", "is_active"]


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ["user", "badge", "minted", "earned_at"]
    list_filter = ["minted", "badge__rarity"]
    raw_id_fields = ["user", "badge"]


@admin.register(LootChest)
class LootChestAdmin(admin.ModelAdmin):
    list_display = ["user", "rarity", "loot_type", "opened", "source", "created_at"]
    list_filter = ["rarity", "opened", "loot_type"]
    raw_id_fields = ["user"]
