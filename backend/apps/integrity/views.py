"""Public wallet integrity API and staff export for pilot allocations."""

import csv
import io

from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .services import build_integrity_export_rows, build_wallet_integrity, is_valid_wallet


class IntegrityThrottle(ScopedRateThrottle):
    scope = "integrity_wallet"


class IntegrityWalletView(APIView):
    """GET reputation bundle for a single wallet (B2B pilot surface)."""

    permission_classes = [AllowAny]
    throttle_classes = [IntegrityThrottle]

    def get(self, request, wallet_address: str):
        if not is_valid_wallet(wallet_address):
            return Response({"detail": "Invalid wallet address."}, status=400)

        bundle = build_wallet_integrity(wallet_address)
        if bundle is None:
            return Response({"detail": "Wallet not found."}, status=404)
        return Response(bundle)


class IntegrityExportView(APIView):
    """Staff export of all scored wallets (JSON or CSV)."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        fmt = (request.query_params.get("format") or "json").lower()
        rows = build_integrity_export_rows()

        if fmt == "csv":
            buffer = io.StringIO()
            writer = csv.DictWriter(
                buffer,
                fieldnames=[
                    "walletAddress",
                    "compositeScore",
                    "teachingValue",
                    "originality",
                    "communityImpact",
                    "farmingFlag",
                    "farmingPercentage",
                    "contributionCount",
                    "scoredAt",
                ],
            )
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
            return Response(
                buffer.getvalue(),
                content_type="text/csv",
                headers={"Content-Disposition": 'attachment; filename="integrity-export.csv"'},
            )

        return Response({"results": rows, "count": len(rows)})
