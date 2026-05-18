import logging

from django.conf import settings as django_settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.contributions.models import Contribution

from .serializers import ScoreJobRequestSerializer, ScoreRequestSerializer, TwitterSnsAnalysisRequestSerializer
from .service import AICoreScoringService
from .tasks import score_contribution_task

logger = logging.getLogger(__name__)


class AICoreScoreView(APIView):
    """Score text via AI core contract endpoint."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ScoreRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        text: str = serializer.validated_data["text"].strip()
        if not text:
            return Response({"detail": "text is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            score = AICoreScoringService.score_text(text=text, quota_context={"user": request.user})
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as exc:
            logger.error("[AICoreScoreView] Unexpected error: %s", exc)
            return Response({"detail": "Scoring temporarily unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(score.to_dict(), status=status.HTTP_200_OK)


class AICoreMetricsView(APIView):
    """Prometheus scrape endpoint for AI-core and payout counters."""

    permission_classes = [AllowAny]

    def get(self, request):
        from django.http import HttpResponse
        from .metrics import render_prometheus_metrics

        return HttpResponse(render_prometheus_metrics(), content_type="text/plain; version=0.0.4")


class AICoreTwitterAnalysisView(APIView):
    """Analyze Twitter/SNS posts for a keyword or account and compare against the current user's content."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwitterSnsAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bearer_token = getattr(django_settings, "TWITTER_BEARER_TOKEN", "")
        if not bearer_token:
            return Response(
                {"detail": "Twitter API is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            result = AICoreScoringService.analyze_twitter_sns_data(
                keyword_or_account=serializer.validated_data["keyword_or_account"],
                current_user_text=serializer.validated_data["current_user_text"],
                current_user_account_text=serializer.validated_data.get("current_user_account_text", ""),
                mode=serializer.validated_data["mode"],
                bearer_token=bearer_token,
                top_n=serializer.validated_data["top_n"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.error("[AICoreTwitterAnalysisView] Unexpected error: %s", exc)
            return Response({"detail": "Twitter analysis temporarily unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(result, status=status.HTTP_200_OK)


class AICoreScoreJobView(APIView):
    """Queue async contribution scoring through ai_core workflow task."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ScoreJobRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contribution_id = serializer.validated_data["contribution_id"]

        contribution = Contribution.objects.filter(id=contribution_id, user=request.user).first()
        if not contribution:
            return Response({"detail": "Contribution not found"}, status=status.HTTP_404_NOT_FOUND)

        task = score_contribution_task.delay(str(contribution.id))
        return Response(
            {
                "status": "queued",
                "task_id": task.id,
                "contribution_id": str(contribution.id),
            },
            status=status.HTTP_202_ACCEPTED,
        )
