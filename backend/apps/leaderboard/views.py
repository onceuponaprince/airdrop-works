"""Read-only leaderboard slices backed by materialized ``LeaderboardEntry`` rows."""
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import LeaderboardEntry
from .serializers import LeaderboardEntrySerializer
from common.pagination import LeaderboardPagination


class GlobalLeaderboardView(generics.ListAPIView):
    """Global scope entries; ``?period=`` defaults to ``all_time`` (must match stored rows)."""

    serializer_class = LeaderboardEntrySerializer
    permission_classes = [AllowAny]
    pagination_class = LeaderboardPagination

    def get_queryset(self):
        period = self.request.query_params.get("period", "all_time")
        return LeaderboardEntry.objects.filter(
            scope="global", period=period
        ).select_related("user").order_by("rank")


class BranchLeaderboardView(generics.ListAPIView):
    """Per-branch scope from URL ``branch``; same ``period`` query param as global."""

    serializer_class = LeaderboardEntrySerializer
    permission_classes = [AllowAny]
    pagination_class = LeaderboardPagination

    def get_queryset(self):
        branch = self.kwargs["branch"]
        period = self.request.query_params.get("period", "all_time")
        return LeaderboardEntry.objects.filter(
            scope=branch, period=period
        ).select_related("user").order_by("rank")
