import re

from rest_framework import serializers
from .models import Contribution, CrawlSourceConfig


class ContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contribution
        fields = [
            "id", "platform", "content_text", "content_url",
            "teaching_value", "originality", "community_impact",
            "total_score", "farming_flag", "farming_explanation",
            "dimension_explanations", "xp_awarded", "scored_at", "created_at",
        ]
        read_only_fields = fields


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
