from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import Avg, Count, Sum
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contributions.models import Contribution, CrawlSourceConfig


class HealthCheckView(APIView):
    """Unauthenticated health check for load balancers and uptime monitors."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def get(self, request):
        db_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_ok = True
        except Exception:
            pass

        redis_ok = False
        try:
            from django.core.cache import cache
            cache.set("_health", "1", 5)
            redis_ok = cache.get("_health") == "1"
        except Exception:
            pass

        healthy = db_ok and redis_ok
        status_code = 200 if healthy else 503
        return Response(
            {"status": "ok" if healthy else "degraded", "db": db_ok, "redis": redis_ok},
            status=status_code,
        )


class AdminOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        user_model = get_user_model()
        users = user_model.objects.count()
        contribution_qs = Contribution.objects.all()
        contributions = contribution_qs.count()
        scored = contribution_qs.filter(scored_at__isnull=False).count()
        unscored = contribution_qs.filter(scored_at__isnull=True).count()
        active_sources = CrawlSourceConfig.objects.filter(is_active=True).count()
        farming_contributions = contribution_qs.filter(farming_flag="farming").count()
        aggregate = contribution_qs.aggregate(
            total_xp_awarded=Sum("xp_awarded"),
            average_score=Avg("total_score"),
            distinct_platforms=Count("platform", distinct=True),
        )

        return Response(
            {
                "users": users,
                "contributions": contributions,
                "scoredContributions": scored,
                "unscoredContributions": unscored,
                "activeCrawlSources": active_sources,
                "farmingContributions": farming_contributions,
                "totalXpAwarded": aggregate["total_xp_awarded"] or 0,
                "averageContributionScore": round(aggregate["average_score"] or 0, 2),
                "trackedPlatforms": aggregate["distinct_platforms"] or 0,
            }
        )


class DebugSentryView(APIView):
    """Admin-only endpoint to trigger a Sentry test event."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            import sentry_sdk

            sentry_sdk.capture_message("sentry test event from debug endpoint")
            return Response({"sent": True})
        except ImportError:
            return Response({"sent": False, "reason": "sentry-sdk not installed"}, status=500)
        except Exception as exc:  # pragma: no cover - operational
            return Response({"sent": False, "error": str(exc)}, status=500)
