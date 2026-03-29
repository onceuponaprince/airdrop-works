from rest_framework import serializers
from .models import LeaderboardEntry


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    """Serializes leaderboard rows with camelCase output for the frontend API contract."""

    walletAddress = serializers.CharField(source="user.wallet_address", read_only=True)
    displayName = serializers.CharField(source="user.display_name", read_only=True)
    avatarUrl = serializers.CharField(source="user.avatar_url", read_only=True)
    contributionCount = serializers.IntegerField(source="contribution_count", read_only=True)
    snapshotAt = serializers.DateTimeField(source="snapshot_at", read_only=True)

    class Meta:
        model = LeaderboardEntry
        fields = [
            "rank", "walletAddress", "displayName", "avatarUrl",
            "xp", "contributionCount", "scope", "period", "snapshotAt",
        ]
