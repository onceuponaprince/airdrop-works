"""Allocation policy listing and batch classification (protocol pilots)."""

import csv
import io

from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .allocation_service import classify_wallets
from .policy_presets import DEFAULT_PRESET_KEY, list_presets


class IntegrityPolicyListView(APIView):
    """Public list of allocation presets for sales / integration docs."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"presets": list_presets(), "defaultPreset": DEFAULT_PRESET_KEY})


class IntegrityAllocateView(APIView):
    """Staff: classify wallets with a policy preset (JSON or CSV)."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        preset = (request.data.get("preset") or DEFAULT_PRESET_KEY).strip()
        wallets = request.data.get("wallets")
        fmt = (
            request.data.get("format")
            or request.query_params.get("output")
            or "json"
        ).lower()

        if wallets is not None and not isinstance(wallets, list):
            return Response({"detail": "wallets must be an array of addresses."}, status=400)

        try:
            rows = classify_wallets(wallets, preset)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        if fmt == "csv":
            return _csv_response(rows, filename=f"allocation-{preset}.csv")

        tier_counts: dict[str, int] = {}
        for row in rows:
            tier = row.get("tier", "exclude")
            tier_counts[tier] = tier_counts.get(tier, 0) + 1

        return Response(
            {
                "preset": preset,
                "count": len(rows),
                "tierCounts": tier_counts,
                "results": rows,
            }
        )


def _csv_response(rows: list[dict], *, filename: str) -> Response:
    fieldnames = [
        "walletAddress",
        "compositeScore",
        "teachingValue",
        "originality",
        "communityImpact",
        "farmingFlag",
        "farmingPercentage",
        "contributionCount",
        "tier",
        "recommendedAction",
        "allocationWeight",
        "appealEligible",
        "rationale",
        "scoredAt",
    ]
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return Response(
        buffer.getvalue(),
        content_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
