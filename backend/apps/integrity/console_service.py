"""Protocol console read aggregates for B2B operators (Phase 5 Wave 2)."""

from __future__ import annotations

from typing import Any

from django.db.models import Avg, Count, Q

from apps.accounts.models import User
from apps.contributions.models import Contribution

from .models import ScoreAppeal
from .services import build_integrity_export_rows


def build_console_overview() -> dict[str, Any]:
    scored_qs = Contribution.objects.filter(scored_at__isnull=False)
    wallets_with_scores = (
        User.objects.filter(contributions__scored_at__isnull=False)
        .distinct()
        .count()
    )
    agg = scored_qs.aggregate(
        avg_score=Avg("total_score"),
        farming_count=Count("id", filter=Q(farming_flag="farming")),
        total_scored=Count("id"),
    )
    total_scored = agg["total_scored"] or 0
    farming_pct = int(round(100 * (agg["farming_count"] or 0) / total_scored)) if total_scored else 0

    pending_appeals = ScoreAppeal.objects.filter(status="pending").count()
    resolved_appeals = ScoreAppeal.objects.exclude(status="pending").count()

    return {
        "walletsWithScores": wallets_with_scores,
        "scoredContributions": total_scored,
        "averageCompositeScore": int(round(agg["avg_score"] or 0)),
        "farmingRatePercent": farming_pct,
        "pendingAppeals": pending_appeals,
        "resolvedAppeals": resolved_appeals,
    }


def build_console_wallets(*, limit: int = 50, offset: int = 0) -> dict[str, Any]:
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    rows = build_integrity_export_rows()
    total = len(rows)
    page = rows[offset : offset + limit]
    return {"count": total, "limit": limit, "offset": offset, "results": page}


def build_console_appeals(
    *,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    from .appeals_service import serialize_appeal

    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    qs = ScoreAppeal.objects.select_related("user", "contribution").order_by("-created_at")
    if status:
        qs = qs.filter(status=status)

    total = qs.count()
    page = qs[offset : offset + limit]
    return {
        "count": total,
        "limit": limit,
        "offset": offset,
        "results": [serialize_appeal(a) for a in page],
    }
