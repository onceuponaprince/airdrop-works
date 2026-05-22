"""Root URL configuration for airdrop-works API.

All API endpoints are versioned under /api/v1/. The health check is
available at both /health/ (root, for load balancers) and
/api/v1/health/ (deep check with DB + Redis status).
"""
from django.contrib import admin
from django.urls import path, include

from apps.contributions.views import (
    AdminContributionDetailView,
    AdminContributionListView,
)
from apps.core.views import HealthCheckView
from apps.quests.views import AdminCampaignDetailView, AdminCampaignListCreateView
from apps.rewards.webhooks import subgraph_webhook, webhook_health

urlpatterns = [
    path("admin/", admin.site.urls),

    # Root-level health check (load balancers, uptime monitors)
    path("health/", HealthCheckView.as_view(), name="root_health_check"),
    path("api/v1/health/", HealthCheckView.as_view(), name="api_health_check"),

    # API v1
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/ai-core/", include("apps.ai_core.urls")),
    path("api/v1/judge/", include("apps.judge.urls")),
    path("api/v1/contributions/", include("apps.contributions.urls")),
    path("api/v1/quests/", include("apps.quests.urls")),
    path("api/v1/profiles/", include("apps.profiles.urls")),
    path("api/v1/core/", include("apps.core.urls")),
    path("api/v1/leaderboard/", include("apps.leaderboard.urls")),
    path("api/v1/rewards/", include("apps.rewards.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/spore/", include("apps.spore.urls")),
    path("api/v1/admin/", include("apps.admin.urls")),
    path("api/v1/integrity/", include("apps.integrity.urls")),
    path(
        "api/v1/admin/campaigns/",
        AdminCampaignListCreateView.as_view(),
        name="admin_campaigns_alias_list",
    ),
    path(
        "api/v1/admin/campaigns/<uuid:pk>/",
        AdminCampaignDetailView.as_view(),
        name="admin_campaigns_alias_detail",
    ),
    path(
        "api/v1/admin/contributions/",
        AdminContributionListView.as_view(),
        name="admin_contributions_alias_list",
    ),
    path(
        "api/v1/admin/contributions/<uuid:pk>/",
        AdminContributionDetailView.as_view(),
        name="admin_contributions_alias_detail",
    ),
    path("api/v1/notifications/", include("apps.notifications.urls")),

    # Subgraph webhook for on-chain event sync
    path("api/v1/webhooks/subgraph/", subgraph_webhook, name="subgraph_webhook"),
    path("api/v1/webhooks/subgraph/health/", webhook_health, name="subgraph_webhook_health"),
]
