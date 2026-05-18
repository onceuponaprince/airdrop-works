"""Deterministic-ish heuristic fallback for AI Judge scoring."""
from __future__ import annotations

import random
import re

from .types import ScoreResult

EXPLANATORY_KEYWORDS = {
    "how to",
    "why",
    "guide",
    "tutorial",
    "example",
    "walkthrough",
    "explain",
    "learn",
    "documented",
}

COMMUNITY_KEYWORDS = {
    "community",
    "bug",
    "report",
    "tool",
    "tools",
    "builder",
    "open source",
    "moderation",
    "translation",
    "support",
    "help",
}

FARMING_KEYWORDS = {
    "airdrop",
    "gm",
    "wagmi",
    "moon",
    "wen",
    "like and retweet",
    "follow for follow",
    "engagement",
    "comment below",
    "thread",
}


def _clamp(value: int) -> int:
    return max(0, min(100, value))


def _keyword_hits(text: str, keywords: set[str]) -> int:
    lowered = text.lower()
    return sum(1 for keyword in keywords if keyword in lowered)


def score_text_heuristically(text: str, custom_instructions: str = "") -> ScoreResult:
    """Return a lightweight fallback score shaped like the LLM response."""
    cleaned = text.strip()
    lowered = cleaned.lower()
    words = re.findall(r"[A-Za-z0-9_']+", lowered)
    unique_words = set(words)
    word_count = len(words)
    unique_ratio = len(unique_words) / word_count if word_count else 0.0
    sentence_count = max(1, len(re.findall(r"[.!?]+", cleaned)))

    explanatory_hits = _keyword_hits(lowered, EXPLANATORY_KEYWORDS)
    community_hits = _keyword_hits(lowered, COMMUNITY_KEYWORDS)
    farming_hits = _keyword_hits(lowered, FARMING_KEYWORDS)

    teaching_value = _clamp(
        18
        + min(word_count * 2, 34)
        + int(unique_ratio * 18)
        + explanatory_hits * 8
        + min(sentence_count * 2, 10)
    )
    originality = _clamp(
        22
        + int(unique_ratio * 32)
        + min(len(unique_words) // 4, 12)
        - max(0, farming_hits - 1) * 4
    )
    community_impact = _clamp(
        20
        + community_hits * 9
        + int(unique_ratio * 15)
        + min(sentence_count * 2, 10)
    )

    composite_score = _clamp(50 + random.randint(-10, 10))

    if farming_hits >= 3 or lowered.count("#") >= 4 or "like and retweet" in lowered:
        farming_flag = "farming"
        farming_explanation = "Heuristic fallback detected heavy engagement-bait patterns."
    elif farming_hits >= 1 or word_count < 20 or unique_ratio < 0.45:
        farming_flag = "ambiguous"
        farming_explanation = "Heuristic fallback found some low-effort or mixed-value signals."
    else:
        farming_flag = "genuine"
        farming_explanation = "Heuristic fallback found mostly substantive, non-promotional language."

    if custom_instructions:
        farming_explanation = f"{farming_explanation} Custom instructions were also applied heuristically."

    return ScoreResult(
        teaching_value=teaching_value,
        originality=originality,
        community_impact=community_impact,
        composite_score=composite_score,
        farming_flag=farming_flag,
        farming_explanation=farming_explanation,
        dimension_explanations={
            "teaching_value": "Heuristic fallback rewarded explanatory language, examples, and length.",
            "originality": "Heuristic fallback rewarded lexical variety and penalized repetitive patterns.",
            "community_impact": "Heuristic fallback rewarded community-oriented keywords and practical utility.",
        },
    )