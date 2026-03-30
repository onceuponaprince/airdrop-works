"""AI core scoring service and stable app-facing contract."""
import hashlib
import json
import logging

from django.conf import settings

from .types import ScoreResult

logger = logging.getLogger(__name__)
MOCK_SCORE_TEXT = "Mock score."

BASE_SCORING_PROMPT = """You are the AI Judge for AI(r)Drop, a Web3 contribution scoring platform.

Evaluate the following Web3 content and score it across three dimensions (0-100 each):

- Teaching Value: Does this help someone understand something? Explains, clarifies, onboards?
- Originality: Novel insight or recycled common knowledge? Adds to the discourse?
- Community Impact: Serves the community? Bug reports, tools, translations, moderation?

Also determine farming_flag:
- \"genuine\": authentic content created to provide value
- \"farming\": engagement farming patterns - templates, excessive hashtags, low-effort hype, bot-like structure
- \"ambiguous\": has some value but also farming signals

{custom_instructions}

Respond ONLY with valid JSON, no other text:
{{
  \"teaching_value\": <0-100>,
  \"originality\": <0-100>,
  \"community_impact\": <0-100>,
  \"composite_score\": <rounded average>,
  \"farming_flag\": \"genuine\"|\"farming\"|\"ambiguous\",
  \"farming_explanation\": \"<1-2 sentences>\",
  \"dimension_explanations\": {{
    \"teaching_value\": \"<1 sentence>\",
    \"originality\": \"<1 sentence>\",
    \"community_impact\": \"<1 sentence>\"
  }}
}}"""


class AICoreScoringService:
    """Stable scoring interface used by app-facing judge compatibility layers."""

    @staticmethod
    def hash_content(text: str) -> str:
        return hashlib.sha256(text.strip().encode()).hexdigest()

    @staticmethod
    def score_text(text: str, custom_instructions: str = "") -> ScoreResult:
        if not settings.ANTHROPIC_API_KEY:
            logger.warning("[AICore] No ANTHROPIC_API_KEY - returning mock scores")
            return AICoreScoringService._mock_result()

        import anthropic

        prompt = BASE_SCORING_PROMPT.format(custom_instructions=custom_instructions)
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        try:
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=512,
                messages=[{"role": "user", "content": f"{prompt}\n\nContent:\n\n{text}"}],
            )
        except anthropic.AuthenticationError as exc:
            logger.error("[AICore] Anthropic auth failure: %s", exc)
            raise ValueError("AI core configuration error") from exc
        except anthropic.PermissionDeniedError as exc:
            api_msg = str(exc)
            if "credit balance" in api_msg.lower():
                logger.error("[AICore] Anthropic credits exhausted")
                raise ValueError("Scoring temporarily unavailable - service credit exhausted") from exc
            logger.error("[AICore] Anthropic permission denied: %s", api_msg)
            raise ValueError("Scoring temporarily unavailable") from exc
        except anthropic.RateLimitError as exc:
            logger.warning("[AICore] Anthropic rate limit hit: %s", exc)
            raise ValueError("Rate limit reached - please retry shortly") from exc
        except anthropic.BadRequestError as exc:
            logger.error("[AICore] Anthropic bad request: %s", exc)
            raise ValueError("AI core request error") from exc
        except anthropic.APIStatusError as exc:
            logger.error("[AICore] Anthropic API error %s: %s", exc.status_code, exc.message)
            raise ValueError("AI core unavailable") from exc

        response_text = message.content[0].text.strip() if message.content else ""

        # Claude may wrap JSON in ```json ... ``` fences — strip them.
        if response_text.startswith("```"):
            first_nl = response_text.index("\n") if "\n" in response_text else 3
            response_text = response_text[first_nl + 1 :]
            if response_text.endswith("```"):
                response_text = response_text[: -3].strip()

        try:
            data = json.loads(response_text)
            return ScoreResult(
                teaching_value=int(data["teaching_value"]),
                originality=int(data["originality"]),
                community_impact=int(data["community_impact"]),
                composite_score=int(data["composite_score"]),
                farming_flag=data["farming_flag"],
                farming_explanation=data["farming_explanation"],
                dimension_explanations=data["dimension_explanations"],
            )
        except (KeyError, ValueError, TypeError) as exc:
            logger.error("[AICore] Failed to parse Anthropic response: %s", exc)
            raise ValueError("AI core returned an unparseable response") from exc

    @staticmethod
    def _mock_result() -> ScoreResult:
        return ScoreResult(
            teaching_value=65,
            originality=55,
            community_impact=60,
            composite_score=60,
            farming_flag="genuine",
            farming_explanation="Mock result - configure ANTHROPIC_API_KEY for real scoring.",
            dimension_explanations={
                "teaching_value": MOCK_SCORE_TEXT,
                "originality": MOCK_SCORE_TEXT,
                "community_impact": MOCK_SCORE_TEXT,
            },
        )
