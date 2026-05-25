"""Allocation policy presets for protocol pilots (ADR Phase 2)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Tier = Literal["A", "B", "C", "exclude"]
Action = Literal["full", "reduced", "review", "exclude"]


@dataclass(frozen=True)
class TierRule:
    tier: Tier
    action: Action
    min_composite: int
    max_farming_pct: int
    allow_farming_flag: frozenset[str]


@dataclass(frozen=True)
class AllocationPreset:
    key: str
    label: str
    description: str
    use_case: str
    tier_rules: tuple[TierRule, ...]


ALLOCATION_PRESETS: dict[str, AllocationPreset] = {
    "airdrop_strict": AllocationPreset(
        key="airdrop_strict",
        label="Airdrop — strict",
        description="High bar for main allocation; farmers and low-quality accounts excluded.",
        use_case="Token snapshots and season-end drops where sell pressure risk is high.",
        tier_rules=(
            TierRule("A", "full", 70, 15, frozenset({"genuine", "ambiguous"})),
            TierRule("B", "reduced", 55, 25, frozenset({"genuine", "ambiguous"})),
            TierRule("C", "review", 40, 40, frozenset({"genuine", "ambiguous"})),
            TierRule("exclude", "exclude", 0, 100, frozenset({"genuine", "ambiguous", "farming"})),
        ),
    ),
    "grants_balanced": AllocationPreset(
        key="grants_balanced",
        label="Grants — balanced",
        description="Moderate thresholds; ambiguous flags land in review tier.",
        use_case="Creator grants and contributor programmes with manual committee review.",
        tier_rules=(
            TierRule("A", "full", 60, 25, frozenset({"genuine", "ambiguous"})),
            TierRule("B", "reduced", 45, 40, frozenset({"genuine", "ambiguous"})),
            TierRule("C", "review", 30, 55, frozenset({"genuine", "ambiguous", "farming"})),
            TierRule("exclude", "exclude", 0, 100, frozenset({"genuine", "ambiguous", "farming"})),
        ),
    ),
    "allowlist_genuine_only": AllocationPreset(
        key="allowlist_genuine_only",
        label="Allowlist — genuine only",
        description="Only clearly genuine accounts receive allocation weight.",
        use_case="Pre-snapshot allowlists where farming risk must be near zero.",
        tier_rules=(
            TierRule("A", "full", 50, 10, frozenset({"genuine"})),
            TierRule("exclude", "exclude", 0, 100, frozenset({"genuine", "ambiguous", "farming"})),
        ),
    ),
}

DEFAULT_PRESET_KEY = "airdrop_strict"


def list_presets() -> list[dict[str, str]]:
    return [
        {
            "key": p.key,
            "label": p.label,
            "description": p.description,
            "useCase": p.use_case,
        }
        for p in ALLOCATION_PRESETS.values()
    ]


def get_preset(key: str) -> AllocationPreset | None:
    return ALLOCATION_PRESETS.get(key)
