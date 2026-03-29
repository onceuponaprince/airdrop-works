"""Persistent graph + scoring models for SPORE."""

from django.conf import settings
from django.db import models

from common.models import BaseModel

NODE_TYPE_CHOICES = [
    ("account", "Account"),
    ("content", "Content"),
    ("entity", "Entity"),
    ("signal", "Signal"),
]

EDGE_TYPE_CHOICES = [
    ("authored", "Authored"),
    ("mentions", "Mentions"),
    ("reply_to", "Reply To"),
    ("quotes", "Quotes"),
    ("semantic", "Semantic"),
    ("interacts", "Interacts"),
    ("follows", "Follows"),
    ("co_occurs", "Co-occurs"),
]

SOURCE_PLATFORM_CHOICES = [
    ("twitter", "Twitter/X"),
    ("discord", "Discord"),
    ("telegram", "Telegram"),
    ("github", "GitHub"),
    ("manual", "Manual"),
]


class Tenant(BaseModel):
    slug = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    plan = models.CharField(max_length=32, default="starter")
    quota_daily_query = models.IntegerField(default=1000)
    quota_daily_ingest = models.IntegerField(default=500)
    quota_daily_relationship = models.IntegerField(default=1000)
    quota_daily_brief_generate = models.IntegerField(default=200)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = "spore_tenants"
        indexes = [
            models.Index(fields=["slug", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.slug}:{self.plan}"


class TenantMembership(BaseModel):
    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("member", "Member"),
        ("viewer", "Viewer"),
    ]

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="spore_tenant_memberships",
    )
    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default="member")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "spore_tenant_memberships"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "user"],
                name="uniq_spore_tenant_user_membership",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "role", "is_active"]),
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.tenant_id}:{self.user_id}:{self.role}"


class SporeApiKey(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_spore_api_keys",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=128)
    prefix = models.CharField(max_length=16, db_index=True)
    key_hash = models.CharField(max_length=128, unique=True)
    is_active = models.BooleanField(default=True, db_index=True)
    last_used_at = models.DateTimeField(null=True, blank=True, db_index=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = "spore_api_keys"
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
            models.Index(fields=["prefix", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.tenant_id}:{self.name}:{self.prefix}"


class UsageEvent(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="usage_events",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="spore_usage_events",
        null=True,
        blank=True,
    )
    api_key = models.ForeignKey(
        SporeApiKey,
        on_delete=models.SET_NULL,
        related_name="usage_events",
        null=True,
        blank=True,
    )
    metric = models.CharField(max_length=64, db_index=True)
    units = models.IntegerField(default=1)
    status_code = models.IntegerField(default=200, db_index=True)
    request_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = "spore_usage_events"
        indexes = [
            models.Index(fields=["tenant", "metric", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["api_key", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.tenant_id}:{self.metric}:{self.units}"


class UsageDailyCounter(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="daily_counters",
    )
    metric = models.CharField(max_length=64)
    day = models.DateField(db_index=True)
    count = models.IntegerField(default=0)

    class Meta:
        db_table = "spore_usage_daily_counters"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "metric", "day"],
                name="uniq_spore_usage_daily_counter",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "day"]),
        ]

    def __str__(self) -> str:
        return f"{self.tenant_id}:{self.metric}:{self.day}:{self.count}"


class AuditLog(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="spore_audit_logs",
        null=True,
        blank=True,
    )
    api_key = models.ForeignKey(
        SporeApiKey,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=96, db_index=True)
    target_type = models.CharField(max_length=64, blank=True, default="", db_index=True)
    target_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = "spore_audit_logs"
        indexes = [
            models.Index(fields=["tenant", "action", "-created_at"]),
            models.Index(fields=["target_type", "target_id", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.tenant_id}:{self.action}:{self.target_type}:{self.target_id}"


class GraphNode(BaseModel):
    node_key = models.CharField(max_length=255, unique=True, db_index=True)
    node_type = models.CharField(max_length=24, choices=NODE_TYPE_CHOICES, db_index=True)
    title = models.CharField(max_length=255, blank=True, default="")
    source_platform = models.CharField(
        max_length=16,
        choices=SOURCE_PLATFORM_CHOICES,
        default="manual",
        db_index=True,
    )
    payload = models.JSONField(default=dict)
    ingestion_batch_id = models.CharField(max_length=64, blank=True, default="")
    raw_ref = models.CharField(max_length=255, blank=True, default="")
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "spore_graph_nodes"
        indexes = [
            models.Index(fields=["node_type", "source_platform"]),
            models.Index(fields=["is_deleted", "-updated_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.node_type}:{self.node_key}"


class GraphEdge(BaseModel):
    from_node = models.ForeignKey(
        GraphNode,
        on_delete=models.CASCADE,
        related_name="out_edges",
    )
    to_node = models.ForeignKey(
        GraphNode,
        on_delete=models.CASCADE,
        related_name="in_edges",
    )
    edge_type = models.CharField(max_length=32, choices=EDGE_TYPE_CHOICES, db_index=True)
    source_platform = models.CharField(
        max_length=16,
        choices=SOURCE_PLATFORM_CHOICES,
        default="manual",
        db_index=True,
    )
    weight = models.FloatField(default=1.0)
    metadata = models.JSONField(default=dict)
    last_seen_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "spore_graph_edges"
        constraints = [
            models.UniqueConstraint(
                fields=["from_node", "to_node", "edge_type", "source_platform"],
                name="uniq_spore_graph_edge",
            )
        ]
        indexes = [
            models.Index(fields=["edge_type", "source_platform"]),
            models.Index(fields=["from_node", "edge_type"]),
            models.Index(fields=["to_node", "edge_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.from_node_id}->{self.to_node_id}({self.edge_type})"


class Observation(BaseModel):
    source_platform = models.CharField(max_length=16, choices=SOURCE_PLATFORM_CHOICES, db_index=True)
    source_event_id = models.CharField(max_length=255, db_index=True)
    event_type = models.CharField(max_length=64, db_index=True)
    actor_external_id = models.CharField(max_length=255, db_index=True)
    target_external_id = models.CharField(max_length=255, blank=True, default="", db_index=True)
    content_text = models.TextField(blank=True, default="")
    content_url = models.URLField(blank=True, default="")
    content_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    occurred_at = models.DateTimeField(null=True, blank=True, db_index=True)
    payload = models.JSONField(default=dict)

    class Meta:
        db_table = "spore_observations"
        constraints = [
            models.UniqueConstraint(
                fields=["source_platform", "source_event_id", "event_type"],
                name="uniq_spore_observation_source_event_type",
            )
        ]
        indexes = [
            models.Index(fields=["actor_external_id", "target_external_id"]),
            models.Index(fields=["source_platform", "-occurred_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.source_platform}:{self.event_type}:{self.source_event_id}"


class ScoreRun(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        related_name="score_runs",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="spore_score_runs",
        null=True,
        blank=True,
    )
    contribution_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    source_platform = models.CharField(max_length=16, choices=SOURCE_PLATFORM_CHOICES, default="manual")
    score_version = models.CharField(max_length=32, default="spore-v1")
    context = models.JSONField(default=dict)
    variable_scores = models.JSONField(default=dict)
    explainability = models.JSONField(default=dict)
    confidence = models.FloatField(default=0.0)
    final_score = models.IntegerField(default=0)

    class Meta:
        db_table = "spore_score_runs"
        indexes = [
            models.Index(fields=["contribution_id", "-created_at"]),
            models.Index(fields=["source_platform", "score_version"]),
        ]

    def __str__(self) -> str:
        return f"{self.score_version}:{self.final_score}:{self.contribution_id}"


class GraphQueryRun(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        related_name="query_runs",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="spore_graph_query_runs",
    )
    query_text = models.TextField()
    query_hash = models.CharField(max_length=32, db_index=True)
    hops = models.IntegerField(default=2)
    damping = models.FloatField(default=0.65)
    top_k = models.IntegerField(default=10)
    seed_nodes = models.JSONField(default=list)
    result_count = models.IntegerField(default=0)
    results = models.JSONField(default=list)

    class Meta:
        db_table = "spore_graph_query_runs"
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["query_hash", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"query:{self.query_hash}:{self.result_count}"


class RelationshipAnalysisRun(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.SET_NULL,
        related_name="relationship_runs",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="spore_relationship_runs",
    )
    account_a = models.CharField(max_length=255, db_index=True)
    account_b = models.CharField(max_length=255, db_index=True)
    days = models.IntegerField(default=30)
    features = models.JSONField(default=dict)

    class Meta:
        db_table = "spore_relationship_analysis_runs"
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["account_a", "account_b", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"relationship:{self.account_a}:{self.account_b}"

