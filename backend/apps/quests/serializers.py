from rest_framework import serializers
from django.utils import timezone
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


# Admin Campaign CRUD Serializer (Function 6)
class AdminCampaignSerializer(serializers.ModelSerializer):
    """Admin serializer for creating/updating campaigns with full write access."""

    projectName = serializers.CharField(source="project_name")
    projectLogoUrl = serializers.URLField(
        source="project_logo_url",
        required=False,
        allow_blank=True,
    )
    rewardPool = serializers.DecimalField(source="reward_pool", max_digits=20, decimal_places=6)
    rewardToken = serializers.CharField(source="reward_token", required=False, allow_blank=True)
    startDate = serializers.DateTimeField(source="start_date")
    endDate = serializers.DateTimeField(source="end_date")
    maxParticipants = serializers.IntegerField(source="max_participants", required=False, allow_null=True)
    partySize = serializers.IntegerField(source="party_size", required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    participantCount = serializers.IntegerField(source="participant_count", read_only=True)
    contributorCount = serializers.IntegerField(source="contributor_count", read_only=True)
    totalContributions = serializers.IntegerField(source="total_contributions", read_only=True)
    avgScore = serializers.FloatField(source="avg_score", read_only=True)

    class Meta:
        model = Quest
        fields = [
            "id",
            "title",
            "description",
            "projectName",
            "projectLogoUrl",
            "difficulty",
            "rewardPool",
            "rewardToken",
            "chain",
            "startDate",
            "endDate",
            "maxParticipants",
            "partySize",
            "status",
            "createdAt",
            "participantCount",
            "contributorCount",
            "totalContributions",
            "avgScore",
        ]
        read_only_fields = [
            "id",
            "createdAt",
            "participantCount",
            "contributorCount",
            "totalContributions",
            "avgScore",
        ]

    def validate(self, data):
        """Validate campaign constraints."""
        start_date = data.get("start_date")
        end_date = data.get("end_date")

        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError("end_date must be after start_date")

        difficulty = data.get("difficulty")
        if difficulty and difficulty not in ["D", "C", "B", "A", "S"]:
            raise serializers.ValidationError("difficulty must be one of: D, C, B, A, S")

        reward_pool = data.get("reward_pool")
        if reward_pool is not None and reward_pool < 0:
            raise serializers.ValidationError("reward_pool must be >= 0")

        title = data.get("title")
        if title:
            qs = Quest.objects.filter(title=title)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"title": "A campaign with this title already exists."})

        return data
