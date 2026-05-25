"""Public wallet integrity API and staff export for pilot allocations."""

import csv
import io

from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .allocation_service import classify_wallets
from .policy_presets import DEFAULT_PRESET_KEY, get_preset
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
        # Use `output`, not `format` — DRF treats ?format= as content negotiation.
        fmt = (request.query_params.get("output") or "json").lower()
        preset = (request.query_params.get("preset") or "").strip() or None

        if preset and get_preset(preset) is None:
            return Response({"detail": f"Unknown preset: {preset}"}, status=400)

        if preset:
            rows = classify_wallets(None, preset)
        else:
            rows = build_integrity_export_rows()

        if fmt == "csv":
            fieldnames = [
                "walletAddress",
                "compositeScore",
                "teachingValue",
                "originality",
                "communityImpact",
                "farmingFlag",
                "farmingPercentage",
                "contributionCount",
                "scoredAt",
            ]
            if preset:
                fieldnames.extend(
                    [
                        "tier",
                        "recommendedAction",
                        "allocationWeight",
                        "appealEligible",
                        "rationale",
                    ]
                )
            buffer = io.StringIO()
            writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
            filename = f"integrity-export-{preset}.csv" if preset else "integrity-export.csv"
            return Response(
                buffer.getvalue(),
                content_type="text/csv",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )

        payload: dict = {"results": rows, "count": len(rows)}
        if preset:
            payload["preset"] = preset
        return Response(payload)
