from rest_framework import serializers

from .models import (
    AuditLog,
    GraphNode,
    GraphQueryRun,
    RelationshipAnalysisRun,
    ScoreRun,
    SporeApiKey,
    Tenant,
    UsageEvent,
)


class SporeIngestSerializer(serializers.Serializer):
    source_platform = serializers.ChoiceField(
        choices=["twitter", "discord", "telegram", "github", "manual"],
        default="manual",
    )
    external_id = serializers.CharField(max_length=255)
    text = serializers.CharField(max_length=10000)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    metadata = serializers.JSONField(required=False)
    ingestion_batch_id = serializers.CharField(max_length=64, required=False, allow_blank=True)


class SporeQuerySerializer(serializers.Serializer):
    query_text = serializers.CharField(max_length=10000)
    hops = serializers.IntegerField(min_value=1, max_value=6, default=2)
    damping = serializers.FloatField(min_value=0.1, max_value=1.0, default=0.65)
    top_k = serializers.IntegerField(min_value=1, max_value=50, default=10)


class TwitterRelationshipSerializer(serializers.Serializer):
    account_a = serializers.CharField(max_length=255)
    account_b = serializers.CharField(max_length=255)
    days = serializers.IntegerField(min_value=1, max_value=365, default=30)


class GraphNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GraphNode
        fields = [
            "id",
            "node_key",
            "node_type",
            "title",
            "source_platform",
            "payload",
            "ingestion_batch_id",
            "raw_ref",
            "updated_at",
        ]
        read_only_fields = fields


class BriefGenerationSerializer(serializers.Serializer):
    brand = serializers.CharField(max_length=128)
    audience = serializers.CharField(max_length=256)
    platform = serializers.ChoiceField(choices=["twitter", "discord", "telegram", "github"])
    tone = serializers.CharField(max_length=64)
    objective = serializers.CharField(max_length=512)
    budget = serializers.CharField(max_length=64, required=False, allow_blank=True)
    concept_count = serializers.IntegerField(min_value=1, max_value=10, default=5)


class SporeScoreRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScoreRun
        fields = [
            "id",
            "contribution_id",
            "source_platform",
            "score_version",
            "context",
            "variable_scores",
            "explainability",
            "confidence",
            "final_score",
            "created_at",
        ]
        read_only_fields = fields


class GraphQueryRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = GraphQueryRun
        fields = [
            "id",
            "query_text",
            "query_hash",
            "hops",
            "damping",
            "top_k",
            "seed_nodes",
            "result_count",
            "results",
            "created_at",
        ]
        read_only_fields = fields


class RelationshipAnalysisRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = RelationshipAnalysisRun
        fields = [
            "id",
            "account_a",
            "account_b",
            "days",
            "features",
            "created_at",
        ]
        read_only_fields = fields


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            "id",
            "slug",
            "name",
            "is_active",
            "plan",
            "quota_daily_query",
            "quota_daily_ingest",
            "quota_daily_relationship",
            "quota_daily_brief_generate",
            "metadata",
        ]
        read_only_fields = fields


class SporeApiKeySerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = SporeApiKey
        fields = [
            "id",
            "tenant",
            "name",
            "prefix",
            "is_active",
            "last_used_at",
            "created_at",
            "metadata",
        ]
        read_only_fields = fields


class SporeApiKeyCreateSerializer(serializers.Serializer):
    tenant_slug = serializers.SlugField(max_length=64)
    name = serializers.CharField(max_length=128)
    metadata = serializers.JSONField(required=False)


class SporeTenantCreateSerializer(serializers.Serializer):
    slug = serializers.SlugField(max_length=64)
    name = serializers.CharField(max_length=128)
    plan = serializers.ChoiceField(choices=["starter", "growth", "enterprise"], default="starter")


class SporeSeedScenarioSerializer(serializers.Serializer):
    tenant_slug = serializers.SlugField(max_length=64)
    scenario = serializers.ChoiceField(choices=["twitter_pair", "campaign_launch"])
    content_per_account = serializers.IntegerField(min_value=1, max_value=50, default=8)
    ambient_accounts = serializers.IntegerField(min_value=0, max_value=20, default=4)


class UsageEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageEvent
        fields = [
            "id",
            "metric",
            "units",
            "status_code",
            "request_id",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "action",
            "target_type",
            "target_id",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields

