"""Lightweight lexicon sentiment for ingestion (no ML dependency)."""

from __future__ import annotations

POSITIVE = {
    "good", "great", "love", "excellent", "amazing", "bullish", "win", "wins",
    "helpful", "thanks", "excited", "growth", "launch", "success", "strong",
}
NEGATIVE = {
    "bad", "hate", "scam", "rug", "bearish", "fail", "failed", "worst", "slow",
    "broken", "angry", "fear", "dump", "loss", "terrible", "awful",
}


def analyze_sentiment(text: str) -> dict:
    """Return label, score (-1..1), and token hits for storage on contributions."""
    tokens = [t.strip(".,!?;:()[]\"'").lower() for t in text.split()]
    tokens = [t for t in tokens if t]
    if not tokens:
        return {"label": "neutral", "score": 0.0, "positiveHits": 0, "negativeHits": 0}

    pos = sum(1 for t in tokens if t in POSITIVE)
    neg = sum(1 for t in tokens if t in NEGATIVE)
    raw = (pos - neg) / max(len(tokens), 1)
    score = max(-1.0, min(1.0, raw * 5))

    if score > 0.15:
        label = "positive"
    elif score < -0.15:
        label = "negative"
    else:
        label = "neutral"

    return {
        "label": label,
        "score": round(score, 3),
        "positiveHits": pos,
        "negativeHits": neg,
    }
