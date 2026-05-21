from django.contrib import admin
from django.apps import apps as django_apps


class _PayoutApprovalAdmin(admin.ModelAdmin):
    list_display = ("batch_id", "approved", "created_at", "approved_at", "created_by", "approved_by")
    list_filter = ("approved", "batch_id")
    search_fields = ("batch_id", "notes")


class _BadgeAdmin(admin.ModelAdmin):
    list_display = ["name", "rarity", "chain", "is_active"]
    list_filter = ["rarity", "chain", "is_active"]


class _UserBadgeAdmin(admin.ModelAdmin):
    list_display = ["user", "badge", "minted", "earned_at"]
    list_filter = ["minted", "badge__rarity"]
    raw_id_fields = ["user", "badge"]


class _LootChestAdmin(admin.ModelAdmin):
    list_display = ["user", "rarity", "loot_type", "opened", "source", "created_at"]
    list_filter = ["rarity", "opened", "loot_type"]
    raw_id_fields = ["user"]


def register_reward_admins():
    """Register reward-related admin classes if the models exist.

    This avoids importing models at module import time which can trigger
    conflicting model registrations when multiple code paths expose model
    definitions with the same app label.
    """
    mapping = [
        ("AirdropPayoutApproval", _PayoutApprovalAdmin),
        ("Badge", _BadgeAdmin),
        ("UserBadge", _UserBadgeAdmin),
        ("LootChest", _LootChestAdmin),
    ]

    for model_name, admin_cls in mapping:
        try:
            model = django_apps.get_model("rewards", model_name)
        except LookupError:
            continue
        try:
            admin.site.register(model, admin_cls)
        except admin.sites.AlreadyRegistered:
            # If another import path has already registered this model,
            # skip to avoid duplicate registration errors.
            continue

