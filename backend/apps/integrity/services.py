"""Aggregate wallet-level integrity scores from scored contributions."""

from __future__ import annotations

import re
from typing import Any

from django.db.models import Avg, Count, Max, Q

from apps.accounts.models import User
from apps.contributions.models import Contribution

WALLET_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")


def normalize_wallet(wallet_address: str) -> str:
    return wallet_address.strip().lower()


def is_valid_wallet(wallet_address: str) -> bool:
    return bool(WALLET_RE.match(wallet_address.strip()))


def _dominant_farming_flag(scored_qs) -> str | None:
    latest = scored_qs.order_by("-scored_at").values_list("farming_flag", flat=True).first()
    if latest:
        return latest
    counts = scored_qs.values("farming_flag").annotate(n=Count("id")).order_by("-n")
    top = counts.first()
    return top["farming_flag"] if top else None


def build_wallet_integrity(wallet_address: str) -> dict[str, Any] | None:
    """Return camelCase integrity bundle for a wallet, or None if user missing."""
    if not is_valid_wallet(wallet_address):
        return None

    user = User.objects.filter(wallet_address=normalize_wallet(wallet_address)).first()
    if not user:
        return None

    scored_qs = Contribution.objects.filter(user=user, scored_at__isnull=False)
    count = scored_qs.count()

    if count == 0:
        return {
            "walletAddress": user.wallet_address,
            "compositeScore": 0,
            "teachingValue": 0,
            "originality": 0,
            "communityImpact": 0,
            "farmingFlag": "ambiguous",
            "farmingPercentage": 0,
            "contributionCount": 0,
            "scoredAt": None,
        }

    agg = scored_qs.aggregate(
        avg_teaching=Avg("teaching_value"),
        avg_originality=Avg("originality"),
        avg_impact=Avg("community_impact"),
        avg_total=Avg("total_score"),
        farming_count=Count("id", filter=Q(farming_flag="farming")),
        latest_scored=Max("scored_at"),
    )

    farming_pct = int(round(100 * (agg["farming_count"] or 0) / count))
    latest_scored = agg["latest_scored"]
    scored_at = latest_scored.isoformat() if latest_scored else None

    return {
        "walletAddress": user.wallet_address,
        "compositeScore": int(round(agg["avg_total"] or 0)),
        "teachingValue": int(round(agg["avg_teaching"] or 0)),
        "originality": int(round(agg["avg_originality"] or 0)),
        "communityImpact": int(round(agg["avg_impact"] or 0)),
        "farmingFlag": _dominant_farming_flag(scored_qs) or "ambiguous",
        "farmingPercentage": farming_pct,
        "contributionCount": count,
        "scoredAt": scored_at,
    }


def build_integrity_export_rows() -> list[dict[str, Any]]:
    """All wallets with at least one scored contribution."""
    wallets = (
        User.objects.filter(contributions__scored_at__isnull=False, wallet_address__isnull=False)
        .exclude(wallet_address="")
        .distinct()
        .values_list("wallet_address", flat=True)
    )
    rows: list[dict[str, Any]] = []
    for wallet in wallets:
        bundle = build_wallet_integrity(wallet)
        if bundle:
            rows.append(bundle)
    rows.sort(key=lambda r: r.get("compositeScore", 0), reverse=True)
    return rows
