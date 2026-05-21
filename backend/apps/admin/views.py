"""Admin dashboard statistics (Function 8)."""
from django.core.cache import cache
from django.db.models import Avg, Count, Q, Sum
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contributions.models import Contribution
from apps.quests.models import Quest

CACHE_KEY = "admin_stats:v1"
CACHE_TTL = 300


def _zero_stats():
    return {
        "total_campaigns": 0,
        "active_campaigns": 0,
        "total_contributions": 0,
        "average_score": 0.0,
        "total_xp_awarded": 0,
        "unique_contributors": 0,
        "farming_rate": 0.0,
        "top_contributors": [],
        "score_distribution": {
            "0_20": 0,
            "21_40": 0,
            "41_60": 0,
            "61_80": 0,
            "81_100": 0,
        },
        "platform_breakdown": {
            "twitter": 0,
            "discord": 0,
            "telegram": 0,
            "reddit": 0,
            "github": 0,
        },
    }


def compute_admin_stats():
    total_campaigns = Quest.objects.count()
    active_campaigns = Quest.objects.filter(status="active").count()

    contrib_qs = Contribution.objects.all()
    total_contributions = contrib_qs.count()

    if total_contributions == 0:
        return _zero_stats()

    agg = contrib_qs.aggregate(
        average_score=Avg("total_score"),
        total_xp_awarded=Sum("xp_awarded"),
        unique_contributors=Count("user", distinct=True),
        farming_count=Count("id", filter=Q(farming_flag="farming")),
    )

    farming_count = agg["farming_count"] or 0
    farming_rate = round(farming_count / total_contributions, 4)

    distribution = contrib_qs.aggregate(
        bucket_0_20=Count("id", filter=Q(total_score__lte=20)),
        bucket_21_40=Count("id", filter=Q(total_score__gte=21, total_score__lte=40)),
        bucket_41_60=Count("id", filter=Q(total_score__gte=41, total_score__lte=60)),
        bucket_61_80=Count("id", filter=Q(total_score__gte=61, total_score__lte=80)),
        bucket_81_100=Count("id", filter=Q(total_score__gte=81)),
    )

    top_rows = (
        contrib_qs.values("user__wallet_address")
        .annotate(
            total_xp=Sum("xp_awarded"),
            contributions_count=Count("id"),
        )
        .order_by("-total_xp")[:10]
    )
    top_contributors = [
        {
            "wallet_address": row["user__wallet_address"] or "",
            "total_xp": row["total_xp"] or 0,
            "contributions_count": row["contributions_count"] or 0,
        }
        for row in top_rows
        if row["user__wallet_address"]
    ]

    platform_counts = {
        row["platform"]: row["count"]
        for row in contrib_qs.values("platform").annotate(count=Count("id"))
    }
    platform_breakdown = {
        platform: platform_counts.get(platform, 0)
        for platform in ("twitter", "discord", "telegram", "reddit", "github")
    }

    return {
        "total_campaigns": total_campaigns,
        "active_campaigns": active_campaigns,
        "total_contributions": total_contributions,
        "average_score": round(float(agg["average_score"] or 0), 2),
        "total_xp_awarded": int(agg["total_xp_awarded"] or 0),
        "unique_contributors": agg["unique_contributors"] or 0,
        "farming_rate": farming_rate,
        "top_contributors": top_contributors,
        "score_distribution": {
            "0_20": distribution["bucket_0_20"] or 0,
            "21_40": distribution["bucket_21_40"] or 0,
            "41_60": distribution["bucket_41_60"] or 0,
            "61_80": distribution["bucket_61_80"] or 0,
            "81_100": distribution["bucket_81_100"] or 0,
        },
        "platform_breakdown": platform_breakdown,
    }


class AdminStatsView(APIView):
    """GET /api/v1/admin/stats/ — aggregated admin metrics (cached 5 min)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        cached = cache.get(CACHE_KEY)
        if cached is not None:
            return Response(cached)

        stats = compute_admin_stats()
        cache.set(CACHE_KEY, stats, CACHE_TTL)
        return Response(stats)
