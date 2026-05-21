import re

from rest_framework import serializers
from .models import Contribution, CrawlSourceConfig


class ContributionSerializer(serializers.ModelSerializer):
    """User-facing contribution rows (camelCase for frontend contract)."""

    contentText = serializers.CharField(source="content_text", read_only=True)
    contentUrl = serializers.URLField(source="content_url", read_only=True)
    teachingValue = serializers.IntegerField(source="teaching_value", read_only=True)
    communityImpact = serializers.IntegerField(source="community_impact", read_only=True)
    totalScore = serializers.IntegerField(source="total_score", read_only=True)
    farmingFlag = serializers.CharField(source="farming_flag", read_only=True)
    farmingExplanation = serializers.CharField(source="farming_explanation", read_only=True)
    dimensionExplanations = serializers.JSONField(source="dimension_explanations", read_only=True)
    xpAwarded = serializers.IntegerField(source="xp_awarded", read_only=True)
    scoredAt = serializers.DateTimeField(source="scored_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Contribution
        fields = [
            "id",
            "platform",
            "contentText",
            "contentUrl",
            "teachingValue",
            "originality",
            "communityImpact",
            "totalScore",
            "farmingFlag",
            "farmingExplanation",
            "dimensionExplanations",
            "xpAwarded",
            "scoredAt",
            "createdAt",
        ]
        read_only_fields = fields


class AdminContributionSerializer(serializers.ModelSerializer):
    walletAddress = serializers.CharField(source="user.wallet_address", read_only=True)
    campaignId = serializers.SerializerMethodField()
    scores = serializers.SerializerMethodField()
    scoringMetadata = serializers.SerializerMethodField()
    isFarming = serializers.SerializerMethodField()

    class Meta:
        model = Contribution
        fields = [
            "id",
            "campaignId",
            "walletAddress",
            "platform",
            "content_text",
            "content_url",
            "scores",
            "total_score",
            "isFarming",
            "farming_flag",
            "xp_awarded",
            "scoringMetadata",
            "scored_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_campaignId(self, obj):
        return None

    def get_scores(self, obj):
        return {
            "teaching_value": obj.teaching_value,
            "originality": obj.originality,
            "community_impact": obj.community_impact,
        }

    def get_scoringMetadata(self, obj):
        return {
            "dimension_explanations": obj.dimension_explanations or {},
            "farming_explanation": obj.farming_explanation or "",
            "platform_content_id": obj.platform_content_id or "",
        }

    def get_isFarming(self, obj):
        return obj.farming_flag == "farming"


class CrawlSourceConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrawlSourceConfig
        fields = [
            "id",
            "platform",
            "source_key",
            "is_active",
            "cursor",
            "last_crawled_at",
            "last_error",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "cursor",
            "last_crawled_at",
            "last_error",
            "created_at",
            "updated_at",
        ]


class TwitterCrawlerRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=64)


class DiscordCrawlerRequestSerializer(serializers.Serializer):
    channel_id = serializers.CharField(max_length=64, required=False, allow_blank=True)


class TelegramCrawlerRequestSerializer(serializers.Serializer):
    chat_id = serializers.CharField(max_length=64, required=False, allow_blank=True)


class RedditCrawlerRequestSerializer(serializers.Serializer):
    subreddit = serializers.CharField(max_length=64)

    def validate_subreddit(self, value: str) -> str:
        normalized = value.strip().lower().strip("/")
        if normalized.startswith("r/"):
            normalized = normalized[2:]

        if not normalized:
            raise serializers.ValidationError("subreddit is required")
        if not re.fullmatch(r"[a-z0-9][a-z0-9_]{1,62}", normalized):
            raise serializers.ValidationError("Enter a valid subreddit name")

        return normalized
