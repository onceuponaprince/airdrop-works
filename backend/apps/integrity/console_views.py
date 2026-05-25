"""Protocol console read API (staff / protocol operators)."""

from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .allocation_service import classify_wallets
from .console_service import build_console_appeals, build_console_overview, build_console_wallets
from .policy_presets import DEFAULT_PRESET_KEY, get_preset


class ConsoleOverviewThrottle(ScopedRateThrottle):
    scope = "console_overview"


class ConsoleWalletsThrottle(ScopedRateThrottle):
    scope = "console_wallets"


class ConsoleAppealsThrottle(ScopedRateThrottle):
    scope = "console_appeals"


class ProtocolConsoleOverviewView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = [ConsoleOverviewThrottle]

    def get(self, request):
        return Response(build_console_overview())


class ProtocolConsoleWalletsView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = [ConsoleWalletsThrottle]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 50))
            offset = int(request.query_params.get("offset", 0))
        except ValueError:
            return Response({"detail": "limit and offset must be integers."}, status=400)

        preset = (request.query_params.get("preset") or "").strip() or None
        if preset and get_preset(preset) is None:
            return Response({"detail": f"Unknown preset: {preset}"}, status=400)

        if preset:
            rows = classify_wallets(None, preset)
            total = len(rows)
            page = rows[offset : offset + limit]
            return Response({"count": total, "limit": limit, "offset": offset, "preset": preset, "results": page})

        return Response(build_console_wallets(limit=limit, offset=offset))


class ProtocolConsoleAppealsView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = [ConsoleAppealsThrottle]

    def get(self, request):
        status = request.query_params.get("status") or None
        if status and status not in ("pending", "upheld", "rejected"):
            return Response({"detail": "Invalid status filter."}, status=400)

        try:
            limit = int(request.query_params.get("limit", 50))
            offset = int(request.query_params.get("offset", 0))
        except ValueError:
            return Response({"detail": "limit and offset must be integers."}, status=400)

        return Response(build_console_appeals(status=status, limit=limit, offset=offset))
