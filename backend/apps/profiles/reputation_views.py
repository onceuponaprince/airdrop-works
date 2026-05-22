"""Public reputation history and portable export (Phase 5 Wave 1)."""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.integrity.reputation_portable import (
    DEFAULT_HISTORY_LIMIT,
    MAX_HISTORY_LIMIT,
    build_portable_reputation_export,
    build_reputation_history,
)
from apps.integrity.services import is_valid_wallet


class ReputationThrottle(ScopedRateThrottle):
    scope = "reputation_public"


class ReputationHistoryView(APIView):
    """GET cross-campaign scored contribution timeline for a wallet."""

    permission_classes = [AllowAny]
    throttle_classes = [ReputationThrottle]

    def get(self, request, wallet_address: str):
        if not is_valid_wallet(wallet_address):
            return Response({"detail": "Invalid wallet address."}, status=400)

        try:
            limit = int(request.query_params.get("limit", DEFAULT_HISTORY_LIMIT))
            offset = int(request.query_params.get("offset", 0))
        except ValueError:
            return Response({"detail": "limit and offset must be integers."}, status=400)

        limit = max(1, min(limit, MAX_HISTORY_LIMIT))
        offset = max(0, offset)

        payload = build_reputation_history(wallet_address, limit=limit, offset=offset)
        if payload is None:
            return Response({"detail": "Wallet not found."}, status=404)
        return Response(payload)


class ReputationExportView(APIView):
    """GET portable reputation bundle (summary + profile + history)."""

    permission_classes = [AllowAny]
    throttle_classes = [ReputationThrottle]

    def get(self, request, wallet_address: str):
        if not is_valid_wallet(wallet_address):
            return Response({"detail": "Invalid wallet address."}, status=400)

        try:
            history_limit = int(request.query_params.get("history_limit", DEFAULT_HISTORY_LIMIT))
        except ValueError:
            return Response({"detail": "history_limit must be an integer."}, status=400)

        history_limit = max(1, min(history_limit, MAX_HISTORY_LIMIT))

        payload = build_portable_reputation_export(
            wallet_address,
            history_limit=history_limit,
        )
        if payload is None:
            return Response({"detail": "Wallet not found."}, status=404)
        return Response(payload)
