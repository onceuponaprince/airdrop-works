"""Synchronous AI Judge scoring with content-hash cache (``JudgeCache``).

Delegates LLM calls to ``AICoreScoringService`` while preserving the legacy
response keys expected by the demo API and callers. Identical text reuses DB
cache rows keyed by ``hash_content(text)``.
"""
import logging

from apps.ai_core.service import AICoreScoringService

logger = logging.getLogger(__name__)

def hash_content(text: str) -> str:
    """Stable hash for deduplicating scores (same implementation as ai_core)."""
    return AICoreScoringService.hash_content(text)


def score_contribution(text: str, rubric=None) -> dict:
    """Return dimension scores and farming metadata; cache hit skips the LLM.

    On miss, persists a ``JudgeCache`` row (truncated ``content_text``);
    persistence errors are logged and the in-memory result is still returned.
    ``rubric`` may append custom instructions to the scorer when provided.
    """
    from .models import JudgeCache

    content_hash = hash_content(text)

    # Cache hit
    try:
        cached = JudgeCache.objects.get(content_hash=content_hash)
        logger.debug("[Judge] Cache hit for %s", content_hash[:8])
        return _cache_to_dict(cached)
    except JudgeCache.DoesNotExist:
        pass

    # Call Anthropic
    result = _call_anthropic(text, rubric)

    # Store in cache
    try:
        JudgeCache.objects.create(
            content_hash=content_hash,
            content_text=text[:10000],
            rubric=rubric,
            model_used="claude-sonnet-4-20250514",
            **result,
        )
    except Exception as e:
        logger.warning("[Judge] Failed to cache result: %s", e)

    return result


def _call_anthropic(text: str, rubric=None) -> dict:
    """Run ``AICoreScoringService.score_text``; map result to flat dict for cache."""
    custom_instructions = ""
    if rubric and rubric.custom_instructions:
        custom_instructions = f"\nAdditional campaign instructions:\n{rubric.custom_instructions}"
    score = AICoreScoringService.score_text(text=text, custom_instructions=custom_instructions)
    return score.to_dict()


def _cache_to_dict(cached) -> dict:
    """Serialize a ``JudgeCache`` instance to the public score response shape."""
    return {
        "teaching_value": cached.teaching_value,
        "originality": cached.originality,
        "community_impact": cached.community_impact,
        "composite_score": cached.composite_score,
        "farming_flag": cached.farming_flag,
        "farming_explanation": cached.farming_explanation,
        "dimension_explanations": cached.dimension_explanations,
    }
