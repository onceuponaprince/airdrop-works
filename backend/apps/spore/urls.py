from django.urls import path

from .views import (
    BriefGenerateView,
    SporeApiKeyRevokeView,
    SporeApiKeysView,
    SporeAuditLogsView,
    SporeGraphQueryRunsView,
    SporeIngestView,
    SporeOpsSummaryView,
    SporeQueryView,
    SporeRelationshipRunsView,
    SporeScoreRunDetailView,
    SporeScoreRunsView,
    SporeSeedScenarioView,
    SporeTenantContextView,
    SporeTenantsView,
    SporeUsageEventsView,
    TwitterRelationshipView,
)

urlpatterns = [
    path("ingest/", SporeIngestView.as_view(), name="spore_ingest"),
    path("query/", SporeQueryView.as_view(), name="spore_query"),
    path("relationships/twitter/", TwitterRelationshipView.as_view(), name="spore_twitter_relationship"),
    path("briefs/generate/", BriefGenerateView.as_view(), name="spore_brief_generate"),
    path("ops/summary/", SporeOpsSummaryView.as_view(), name="spore_ops_summary"),
    path("ops/score-runs/", SporeScoreRunsView.as_view(), name="spore_ops_score_runs"),
    path("ops/score-runs/<uuid:pk>/", SporeScoreRunDetailView.as_view(), name="spore_ops_score_run_detail"),
    path("ops/query-runs/", SporeGraphQueryRunsView.as_view(), name="spore_ops_query_runs"),
    path("ops/relationship-runs/", SporeRelationshipRunsView.as_view(), name="spore_ops_relationship_runs"),
    path("ops/tenants/", SporeTenantsView.as_view(), name="spore_ops_tenants"),
    path("ops/seed-scenario/", SporeSeedScenarioView.as_view(), name="spore_ops_seed_scenario"),
    path("ops/tenant-context/", SporeTenantContextView.as_view(), name="spore_ops_tenant_context"),
    path("ops/api-keys/", SporeApiKeysView.as_view(), name="spore_ops_api_keys"),
    path("ops/api-keys/<uuid:pk>/revoke/", SporeApiKeyRevokeView.as_view(), name="spore_ops_api_key_revoke"),
    path("ops/usage-events/", SporeUsageEventsView.as_view(), name="spore_ops_usage_events"),
    path("ops/audit-logs/", SporeAuditLogsView.as_view(), name="spore_ops_audit_logs"),
]

