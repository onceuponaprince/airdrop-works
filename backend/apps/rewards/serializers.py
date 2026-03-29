from rest_framework import serializers
from .models import Badge, UserBadge, LootChest


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "description", "image_url", "rarity", "chain"]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ["id", "badge", "nft_token_id", "minted", "earned_at"]


class LootChestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LootChest
        fields = [
            "id", "rarity", "loot_type", "loot_name", "loot_description",
            "loot_amount", "opened", "opened_at", "source", "created_at",
        ]
        read_only_fields = fields
