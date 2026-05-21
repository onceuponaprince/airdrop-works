"""Marketing copy scoring — performance_marketing_v1 rubric."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

MARKETING_RUBRIC_KEY = "performance_marketing_v1"

MARKETING_PROMPT = """You are the AI Judge for performance marketing copy on AI(r)Drop Growth.

Score the ad copy, landing hero, or social post across five dimensions (0-100 each):

- hook: Does the opening stop the scroll and earn attention?
- clarity: Is the value proposition understandable in seconds?
- audience_fit: Is tone and offer aligned with the stated audience?
- cta_strength: Is the next step obvious and compelling?
- fatigue_risk: How tired/generic does this format feel? (100 = extremely fatigued/cliché, 0 = fresh)

Compute composite_score as a weighted average:
  hook 25%, clarity 25%, audience_fit 20%, cta_strength 20%, fatigue_risk 10% INVERTED (use 100 - fatigue_risk for the fatigue portion).

Respond ONLY with valid JSON:
{
  "hook": <0-100>,
  "clarity": <0-100>,
  "audience_fit": <0-100>,
  "cta_strength": <0-100>,
  "fatigue_risk": <0-100>,
  "composite_score": <0-100>,
  "fatigue_level": "low" | "medium" | "high",
  "dimension_explanations": {
    "hook": "<1 sentence>",
    "clarity": "<1 sentence>",
    "audience_fit": "<1 sentence>",
    "cta_strength": "<1 sentence>",
    "fatigue_risk": "<1 sentence>"
  }
}"""


def _heuristic_marketing_score(text: str) -> dict[str, Any]:
    """Offline-friendly scorer when LLM is unavailable."""
    words = len(text.split())
    base = min(85, 40 + words)
    fatigue = 70 if re.search(r"limited time|act now|don't miss|🚀|🔥", text, re.I) else 35
    hook = min(100, base + 5)
    clarity = min(100, base)
    audience = min(100, base - 5)
    cta = min(100, base + 10 if re.search(r"sign up|try|get started|book", text, re.I) else 0)
    fatigue_portion = 100 - fatigue
    composite = int(round(hook * 0.25 + clarity * 0.25 + audience * 0.20 + cta * 0.20 + fatigue_portion * 0.10))
    level = "high" if fatigue >= 70 else "medium" if fatigue >= 45 else "low"
    return {
        "hook": hook,
        "clarity": clarity,
        "audience_fit": audience,
        "cta_strength": cta,
        "fatigue_risk": fatigue,
        "composite_score": composite,
        "fatigue_level": level,
        "dimension_explanations": {
            "hook": "Heuristic: length and pattern cues only.",
            "clarity": "Heuristic: length and pattern cues only.",
            "audience_fit": "Heuristic: generic baseline.",
            "cta_strength": "Heuristic: CTA keywords detected." if cta > clarity else "Heuristic: weak CTA signals.",
            "fatigue_risk": "Heuristic: promotional clichés detected." if fatigue >= 70 else "Heuristic: moderate freshness.",
        },
    }


def _parse_json_response(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        first_nl = text.index("\n") if "\n" in text else 3
        text = text[first_nl + 1 :]
        if text.endswith("```"):
            text = text[: -3].strip()
    return json.loads(text)


def _to_camel_response(data: dict[str, Any]) -> dict[str, Any]:
    from django.utils import timezone

    explanations = data.get("dimension_explanations") or {}
    fatigue = int(data.get("fatigue_risk") or 0)
    return {
        "rubricKey": MARKETING_RUBRIC_KEY,
        "compositeScore": int(data.get("composite_score") or 0),
        "fatigueRisk": data.get("fatigue_level") or ("high" if fatigue >= 70 else "medium" if fatigue >= 45 else "low"),
        "dimensions": {
            "hook": int(data.get("hook") or 0),
            "clarity": int(data.get("clarity") or 0),
            "audienceFit": int(data.get("audience_fit") or 0),
            "ctaStrength": int(data.get("cta_strength") or 0),
            "fatigueRisk": fatigue,
        },
        "dimensionExplanations": {
            "hook": str(explanations.get("hook") or ""),
            "clarity": str(explanations.get("clarity") or ""),
            "audienceFit": str(explanations.get("audience_fit") or ""),
            "ctaStrength": str(explanations.get("cta_strength") or ""),
            "fatigueRisk": str(explanations.get("fatigue_risk") or ""),
        },
        "scoredAt": timezone.now().isoformat(),
    }


def score_marketing_copy(text: str, quota_context: dict | None = None) -> dict[str, Any]:
    """Score marketing copy; uses Anthropic when configured, else heuristic."""
    if not settings.ANTHROPIC_API_KEY:
        return _to_camel_response(_heuristic_marketing_score(text))

    try:
        from apps.ai_core.ratelimit import reserve_llm_call

        user = (quota_context or {}).get("user")
        tenant = (quota_context or {}).get("tenant")
        if not reserve_llm_call(user=user, tenant=tenant):
            return _to_camel_response(_heuristic_marketing_score(text))
    except Exception:
        pass

    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=512,
            messages=[{"role": "user", "content": f"{MARKETING_PROMPT}\n\nCopy:\n\n{text}"}],
        )
        raw = message.content[0].text.strip() if message.content else ""
        data = _parse_json_response(raw)
        return _to_camel_response(data)
    except Exception as exc:
        logger.warning("[MarketingJudge] LLM failed, using heuristic: %s", exc)
        if getattr(settings, "JUDGE_HEURISTIC_FALLBACK_ENABLED", False):
            return _to_camel_response(_heuristic_marketing_score(text))
        raise ValueError("Marketing scoring temporarily unavailable") from exc
