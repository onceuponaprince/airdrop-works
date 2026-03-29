from django.contrib.auth import get_user_model
from django.db import connection
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
        contributions = Contribution.objects.count()
        unscored = Contribution.objects.filter(scored_at__isnull=True).count()
        active_sources = CrawlSourceConfig.objects.filter(is_active=True).count()

        return Response(
            {
                "users": users,
                "contributions": contributions,
                "unscoredContributions": unscored,
                "activeCrawlSources": active_sources,
            }
        )
