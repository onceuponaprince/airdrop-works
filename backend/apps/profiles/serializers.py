from rest_framework import serializers
from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    """Serializes Profile model with camelCase output for the frontend API contract."""

    walletAddress = serializers.CharField(source="user.wallet_address", read_only=True)
    displayName = serializers.CharField(source="user.display_name", read_only=True)
    primaryBranch = serializers.CharField(source="primary_branch", read_only=True)
    totalXp = serializers.IntegerField(source="total_xp", read_only=True)
    educatorXp = serializers.IntegerField(source="educator_xp", read_only=True)
    builderXp = serializers.IntegerField(source="builder_xp", read_only=True)
    creatorXp = serializers.IntegerField(source="creator_xp", read_only=True)
    scoutXp = serializers.IntegerField(source="scout_xp", read_only=True)
    diplomatXp = serializers.IntegerField(source="diplomat_xp", read_only=True)
    skillTreeState = serializers.JSONField(source="skill_tree_state", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Profile
        fields = [
            "id", "walletAddress", "displayName", "totalXp", "educatorXp",
            "builderXp", "creatorXp", "scoutXp", "diplomatXp",
            "skillTreeState", "rank", "primaryBranch", "createdAt",
        ]
