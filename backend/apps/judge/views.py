"""Public and internal-facing HTTP endpoints for demo AI scoring.

The demo route is unauthenticated, throttled, and delegates to synchronous
scoring in ``service.score_contribution`` (cache + LLM).
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle

from .service import score_contribution

logger = logging.getLogger(__name__)


class JudgeDemoThrottle(AnonRateThrottle):
    """DRF throttle scope ``judge_demo`` (configure rate in ``DEFAULT_THROTTLE_RATES``)."""

    scope = "judge_demo"


class JudgeDemoView(APIView):
    """POST demo scoring: validate ``text`` length, return score dict or 4xx/503.

    Used by the marketing AI Judge demo. ``ValueError`` from scoring maps to 503;
    unexpected errors are logged and returned as a generic 503 (no stack trace).
    """
    permission_classes = [AllowAny]
    throttle_classes = [JudgeDemoThrottle]

    def post(self, request):
        """Body: ``{ "text": "..." }`` (required, max 5000 chars). Returns score JSON."""
        text = request.data.get("text", "").strip()

        if not text:
            return Response({"detail": "text is required"}, status=status.HTTP_400_BAD_REQUEST)

        if len(text) > 5000:
            return Response({"detail": "text too long (max 5000 chars)"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = score_contribution(text)
            return Response(result)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error("[JudgeDemo] Unexpected error: %s", e)
            return Response({"detail": "Scoring temporarily unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
