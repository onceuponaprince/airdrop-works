"""Cross-campaign reputation history and portable export bundles (Phase 5 Wave 1)."""

from __future__ import annotations

from typing import Any

from django.utils import timezone

from apps.accounts.models import User
from apps.contributions.models import Contribution
from apps.profiles.models import Profile

from .services import build_wallet_integrity, is_valid_wallet, normalize_wallet

HISTORY_PREVIEW_LEN = 200
MAX_HISTORY_LIMIT = 100
DEFAULT_HISTORY_LIMIT = 50
EXPORT_SPEC_VERSION = "1.0.0"
REPUTATION_CONTEXT = "https://airdrop.works/schemas/reputation/v1"


def _serialize_history_item(contribution: Contribution) -> dict[str, Any]:
    text = (contribution.content_text or "").strip()
    preview = text if len(text) <= HISTORY_PREVIEW_LEN else text[: HISTORY_PREVIEW_LEN - 1] + "…"
    scored_at = contribution.scored_at.isoformat() if contribution.scored_at else None
    return {
        "id": str(contribution.id),
        "platform": contribution.platform,
        "contentUrl": contribution.content_url or "",
        "contentPreview": preview,
        "teachingValue": contribution.teaching_value,
        "originality": contribution.originality,
        "communityImpact": contribution.community_impact,
        "compositeScore": contribution.total_score,
        "farmingFlag": contribution.farming_flag,
        "xpAwarded": contribution.xp_awarded,
        "scoredAt": scored_at,
    }


def _profile_snippet(user: User) -> dict[str, Any] | None:
    profile = Profile.objects.filter(user=user).first()
    if not profile:
        return None
    return {
        "totalXp": profile.total_xp,
        "rank": profile.rank,
        "primaryBranch": profile.primary_branch,
        "educatorXp": profile.educator_xp,
        "builderXp": profile.builder_xp,
        "creatorXp": profile.creator_xp,
        "scoutXp": profile.scout_xp,
        "diplomatXp": profile.diplomat_xp,
    }


def build_reputation_history(
    wallet_address: str,
    *,
    limit: int = DEFAULT_HISTORY_LIMIT,
    offset: int = 0,
) -> dict[str, Any] | None:
    """Paginated scored-contribution timeline for a wallet."""
    if not is_valid_wallet(wallet_address):
        return None

    user = User.objects.filter(wallet_address=normalize_wallet(wallet_address)).first()
    if not user:
        return None

    limit = max(1, min(limit, MAX_HISTORY_LIMIT))
    offset = max(0, offset)

    qs = Contribution.objects.filter(user=user, scored_at__isnull=False).order_by(
        "-scored_at", "-total_score", "-created_at"
    )
    total = qs.count()
    page = qs[offset : offset + limit]

    return {
        "walletAddress": user.wallet_address,
        "count": total,
        "limit": limit,
        "offset": offset,
        "results": [_serialize_history_item(c) for c in page],
    }


def build_portable_reputation_export(
    wallet_address: str,
    *,
    history_limit: int = DEFAULT_HISTORY_LIMIT,
) -> dict[str, Any] | None:
    """JSON-LD-style portable bundle for protocols and contributors."""
    if not is_valid_wallet(wallet_address):
        return None

    summary = build_wallet_integrity(wallet_address)
    if summary is None:
        return None

    user = User.objects.filter(wallet_address=normalize_wallet(wallet_address)).first()
    if not user:
        return None

    history_limit = max(1, min(history_limit, MAX_HISTORY_LIMIT))
    history = build_reputation_history(wallet_address, limit=history_limit, offset=0)
    assert history is not None

    return {
        "@context": REPUTATION_CONTEXT,
        "type": "PortableReputationExport",
        "specVersion": EXPORT_SPEC_VERSION,
        "exportedAt": timezone.now().isoformat(),
        "walletAddress": summary["walletAddress"],
        "summary": summary,
        "profile": _profile_snippet(user),
        "history": history["results"],
        "meta": {
            "historyCount": history["count"],
            "historyLimit": history_limit,
        },
    }
