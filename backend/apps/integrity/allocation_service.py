"""Map integrity bundles to allocation tiers using policy presets."""

from __future__ import annotations

from typing import Any

from .policy_presets import DEFAULT_PRESET_KEY, TierRule, get_preset
from .services import build_integrity_export_rows, build_wallet_integrity, is_valid_wallet


def _tier_weights() -> dict[str, float]:
    return {"A": 1.0, "B": 0.5, "C": 0.25, "exclude": 0.0}


def _match_rule(row: dict[str, Any], rule: TierRule) -> bool:
    flag = (row.get("farmingFlag") or "ambiguous").lower()
    composite = int(row.get("compositeScore") or 0)
    farming_pct = int(row.get("farmingPercentage") or 0)

    if flag not in rule.allow_farming_flag:
        return False
    if composite < rule.min_composite:
        return False
    if farming_pct > rule.max_farming_pct:
        return False
    return True


def classify_row(row: dict[str, Any], preset_key: str = DEFAULT_PRESET_KEY) -> dict[str, Any]:
    """Return row enriched with tier, recommendedAction, allocationWeight, rationale."""
    preset = get_preset(preset_key)
    if preset is None:
        raise ValueError(f"Unknown preset: {preset_key}")

    matched: TierRule | None = None
    for rule in preset.tier_rules:
        if _match_rule(row, rule):
            matched = rule
            break

    if matched is None:
        matched = preset.tier_rules[-1]

    weights = _tier_weights()
    rationale = (
        f"{preset.label}: tier {matched.tier} — composite {row.get('compositeScore', 0)}, "
        f"farming {row.get('farmingPercentage', 0)}%, flag {row.get('farmingFlag', 'ambiguous')}."
    )

    enriched = dict(row)
    enriched.update(
        {
            "preset": preset_key,
            "tier": matched.tier,
            "recommendedAction": matched.action,
            "allocationWeight": weights.get(matched.tier, 0.0),
            "rationale": rationale,
            "appealEligible": row.get("farmingFlag") in ("farming", "ambiguous"),
        }
    )
    return enriched


def classify_wallets(
    wallets: list[str] | None,
    preset_key: str = DEFAULT_PRESET_KEY,
) -> list[dict[str, Any]]:
    """Classify explicit wallets or all scored wallets when wallets is None."""
    if wallets is None:
        base_rows = build_integrity_export_rows()
    else:
        base_rows = []
        for wallet in wallets:
            if not is_valid_wallet(wallet):
                continue
            bundle = build_wallet_integrity(wallet)
            if bundle:
                base_rows.append(bundle)

    classified = [classify_row(row, preset_key) for row in base_rows]
    tier_order = {"A": 0, "B": 1, "C": 2, "exclude": 3}
    classified.sort(
        key=lambda r: (tier_order.get(str(r.get("tier")), 9), -(r.get("compositeScore") or 0))
    )
    return classified
