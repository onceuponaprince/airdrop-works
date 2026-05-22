"""Protocol console read API (staff / protocol operators)."""

from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .console_service import build_console_appeals, build_console_overview, build_console_wallets


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
