from rest_framework import serializers
from .models import Quest, QuestAcceptance


class QuestSerializer(serializers.ModelSerializer):
    """Serializes Quest model with camelCase output for the frontend API contract."""

    projectName = serializers.CharField(source="project_name", read_only=True)
    projectLogoUrl = serializers.URLField(source="project_logo_url", read_only=True)
    rewardPool = serializers.DecimalField(source="reward_pool", max_digits=20, decimal_places=6, read_only=True)
    rewardToken = serializers.CharField(source="reward_token", read_only=True)
    startDate = serializers.DateTimeField(source="start_date", read_only=True)
    endDate = serializers.DateTimeField(source="end_date", read_only=True)
    maxParticipants = serializers.IntegerField(source="max_participants", read_only=True)
    partySize = serializers.IntegerField(source="party_size", read_only=True)
    participantCount = serializers.IntegerField(source="participant_count", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Quest
        fields = [
            "id", "title", "description", "projectName", "projectLogoUrl",
            "difficulty", "rewardPool", "rewardToken", "chain",
            "startDate", "endDate", "maxParticipants", "partySize",
            "status", "participantCount", "createdAt",
        ]


class QuestAcceptanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestAcceptance
        fields = ["id", "quest", "status", "created_at"]
        read_only_fields = ["id", "created_at"]
