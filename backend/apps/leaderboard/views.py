"""Read-only leaderboard slices backed by materialized ``LeaderboardEntry`` rows."""
from django.db.models import QuerySet
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import LeaderboardEntry
from .serializers import LeaderboardEntrySerializer
from common.pagination import LeaderboardPagination


VALID_PERIODS = {"all_time", "weekly", "monthly"}


def leaderboard_queryset(scope: str, period: str) -> QuerySet[LeaderboardEntry]:
    resolved_period = period if period in VALID_PERIODS else "all_time"
    return (
        LeaderboardEntry.objects.filter(scope=scope, period=resolved_period)
        .select_related("user")
        .only(
            "rank",
            "xp",
            "contribution_count",
            "snapshot_at",
            "scope",
            "period",
            "user__wallet_address",
            "user__display_name",
            "user__avatar_url",
        )
        .order_by("rank")
    )


class GlobalLeaderboardView(generics.ListAPIView):
    """Global scope entries; ``?period=`` defaults to ``all_time`` (must match stored rows)."""

    serializer_class = LeaderboardEntrySerializer
    permission_classes = [AllowAny]
    pagination_class = LeaderboardPagination

    def get_queryset(self):
        period = self.request.query_params.get("period", "all_time")
        return leaderboard_queryset("global", period)


class BranchLeaderboardView(generics.ListAPIView):
    """Per-branch scope from URL ``branch``; same ``period`` query param as global."""

    serializer_class = LeaderboardEntrySerializer
    permission_classes = [AllowAny]
    pagination_class = LeaderboardPagination

    def get_queryset(self):
        branch = self.kwargs["branch"]
        period = self.request.query_params.get("period", "all_time")
        return leaderboard_queryset(branch, period)
