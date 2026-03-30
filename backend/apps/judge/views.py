"""Public and internal-facing HTTP endpoints for demo AI scoring.

The demo route is unauthenticated, throttled, and delegates to synchronous
scoring in ``service.score_contribution`` (cache + LLM).
"""
import json
import logging
import re
import time

import httpx
from django.conf import settings as django_settings
from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle

from apps.payments.services import deduct_credit, get_or_create_user_sub
from .service import score_contribution

logger = logging.getLogger(__name__)

TWITTER_API_BASE = "https://api.twitter.com/2"
ACCOUNT_SCORE_CREDIT_COST = 5
MAX_ACCOUNT_TWEETS = 25


class JudgeDemoThrottle(AnonRateThrottle):
    """DRF throttle scope ``judge_demo`` (configure rate in ``DEFAULT_THROTTLE_RATES``)."""

    scope = "judge_demo"


class JudgeDemoView(APIView):
    """POST demo scoring: validate ``text`` length, return score dict or 4xx/503.

    Used by the marketing AI Judge demo. ``ValueError`` from scoring maps to 503;
    unexpected errors are logged and returned as a generic 503 (no stack trace).
    """
    permission_classes = [AllowAny]
    throttle_classes = [JudgeDemoThrottle]

    def post(self, request):
        """Body: ``{ "text": "..." }`` (required, max 5000 chars). Returns score JSON."""
        text = request.data.get("text", "").strip()

        if not text:
            return Response({"detail": "text is required"}, status=status.HTTP_400_BAD_REQUEST)

        if len(text) > 5000:
            return Response({"detail": "text too long (max 5000 chars)"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = score_contribution(text)
            return Response(result)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error("[JudgeDemo] Unexpected error: %s", e)
            return Response({"detail": "Scoring temporarily unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class JudgeScoreView(APIView):
    """Authenticated, credit-gated single-text scoring."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"detail": "text is required"}, status=status.HTTP_400_BAD_REQUEST)
        if len(text) > 5000:
            return Response({"detail": "text too long (max 5000 chars)"}, status=status.HTTP_400_BAD_REQUEST)

        remaining = deduct_credit(request.user, "score_text")
        try:
            result = score_contribution(text)
            result["credits_remaining"] = remaining
            return Response(result)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error("[JudgeScore] Unexpected error: %s", e)
            return Response({"detail": "Scoring temporarily unavailable"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


def _ndjson_line(obj: dict) -> str:
    return json.dumps(obj) + "\n"


def _fetch_twitter_user(username: str, bearer: str) -> dict:
    url = f"{TWITTER_API_BASE}/users/by/username/{username}?user.fields=profile_image_url"
    resp = httpx.get(url, headers={"Authorization": f"Bearer {bearer}"}, timeout=10)
    if resp.status_code == 429:
        raise ValueError("Twitter rate limit — try again in a few minutes")
    if resp.status_code == 404 or not resp.json().get("data", {}).get("id"):
        raise ValueError(f"Twitter user @{username} not found")
    resp.raise_for_status()
    return resp.json()["data"]


def _fetch_recent_tweets(user_id: str, bearer: str, max_results: int) -> list[dict]:
    url = (
        f"{TWITTER_API_BASE}/users/{user_id}/tweets"
        f"?max_results={min(max_results, 100)}"
        f"&tweet.fields=created_at,author_id"
        f"&exclude=retweets,replies"
    )
    resp = httpx.get(url, headers={"Authorization": f"Bearer {bearer}"}, timeout=15)
    if resp.status_code == 429:
        raise ValueError("Twitter rate limit — try again in a few minutes")
    resp.raise_for_status()
    return resp.json().get("data", [])


def _build_batch_prompt(username: str, tweets: list[dict]) -> str:
    tweet_block = "\n\n".join(
        f"--- TWEET {i} ---\n{t['text']}" for i, t in enumerate(tweets)
    )
    return f"""You are the AI Judge for AI(r)Drop, a Web3 contribution quality scoring platform.

Evaluate each of the following {len(tweets)} tweets from @{username} INDIVIDUALLY across three dimensions (0–100 each):

- Teaching Value: Does this help someone understand something? Explains, clarifies, onboards?
- Originality: Novel insight or recycled common knowledge? Adds to the discourse?
- Community Impact: Serves the community? Bug reports, tools, translations, moderation?

Also determine farmingFlag for each tweet:
- "genuine": authentic content created to provide value
- "farming": engagement farming patterns
- "ambiguous": has some value but also farming signals

After scoring all tweets individually, provide an overall account assessment.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{{
  "tweets": [
    {{
      "index": 0,
      "teachingValue": 72,
      "originality": 65,
      "communityImpact": 80,
      "compositeScore": 72,
      "farmingFlag": "genuine",
      "oneLiner": "one sentence summary of the tweet's value"
    }}
  ],
  "accountSummary": {{
    "overallScore": 70,
    "farmingPercentage": 15,
    "strengths": "one sentence about account strengths",
    "weaknesses": "one sentence about areas to improve",
    "verdict": "genuine"
  }}
}}

TWEETS TO EVALUATE:

{tweet_block}"""


def _strip_code_fences(text: str) -> str:
    if text.startswith("```"):
        first_nl = text.index("\n") if "\n" in text else 3
        text = text[first_nl + 1:]
        if text.endswith("```"):
            text = text[:-3].strip()
    return text


class JudgeScoreAccountView(APIView):
    """Authenticated, credit-gated Twitter account scoring (costs 5 credits).

    Streams NDJSON events: tweets_fetched -> status -> tweet_score* -> final | error
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        username = (request.data.get("username") or "").strip().lstrip("@")
        if not username or not re.match(r"^[A-Za-z0-9_]{1,15}$", username):
            return Response({"detail": "Invalid Twitter handle"}, status=status.HTTP_400_BAD_REQUEST)

        sub = get_or_create_user_sub(request.user)
        if sub.plan == "free":
            return Response(
                {"detail": "Twitter account analysis requires a Pro or Team plan"},
                status=status.HTTP_403_FORBIDDEN,
            )

        remaining = deduct_credit(request.user, "score_account", ACCOUNT_SCORE_CREDIT_COST)

        bearer = django_settings.TWITTER_BEARER_TOKEN
        anthropic_key = django_settings.ANTHROPIC_API_KEY

        if not bearer or not anthropic_key:
            return Response(
                {"detail": "Twitter or AI API not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        def stream():
            try:
                twitter_user = _fetch_twitter_user(username, bearer)
                tweets = _fetch_recent_tweets(twitter_user["id"], bearer, MAX_ACCOUNT_TWEETS)

                if not tweets:
                    yield _ndjson_line({"type": "error", "message": f"@{username} has no recent original tweets"})
                    return

                yield _ndjson_line({
                    "type": "tweets_fetched",
                    "count": len(tweets),
                    "username": username,
                    "displayName": twitter_user.get("name", username),
                    "avatarUrl": twitter_user.get("profile_image_url"),
                })

                yield _ndjson_line({
                    "type": "status",
                    "phase": "scoring",
                    "message": f"AI Judge is reading {len(tweets)} tweets…",
                })

                import anthropic
                client = anthropic.Anthropic(api_key=anthropic_key)
                message = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    messages=[{"role": "user", "content": _build_batch_prompt(username, tweets)}],
                )
                response_text = message.content[0].text.strip() if message.content else ""
                response_text = _strip_code_fences(response_text)

                try:
                    parsed = json.loads(response_text)
                except json.JSONDecodeError:
                    json_match = re.search(r"\{[\s\S]*\}", response_text)
                    if not json_match:
                        yield _ndjson_line({"type": "error", "message": "Failed to parse scoring response"})
                        return
                    parsed = json.loads(json_match.group(0))

                tweet_scores = []
                for i, s in enumerate(parsed.get("tweets", [])):
                    idx = s.get("index", i)
                    tweet = tweets[idx] if idx < len(tweets) else tweets[i] if i < len(tweets) else None
                    if not tweet:
                        continue
                    ts = {
                        "index": i,
                        "tweetId": tweet["id"],
                        "text": tweet["text"],
                        "url": f"https://x.com/{username}/status/{tweet['id']}",
                        "teachingValue": int(s.get("teachingValue", 0)),
                        "originality": int(s.get("originality", 0)),
                        "communityImpact": int(s.get("communityImpact", 0)),
                        "compositeScore": int(s.get("compositeScore", 0)),
                        "farmingFlag": s.get("farmingFlag", "ambiguous"),
                        "oneLiner": s.get("oneLiner", ""),
                    }
                    tweet_scores.append(ts)
                    yield _ndjson_line({"type": "tweet_score", **ts, "score": ts})

                summary = parsed.get("accountSummary", {})
                n = len(tweet_scores) or 1
                genuine_count = sum(1 for t in tweet_scores if t["farmingFlag"] == "genuine")
                avg_teaching = round(sum(t["teachingValue"] for t in tweet_scores) / n)
                avg_originality = round(sum(t["originality"] for t in tweet_scores) / n)
                avg_impact = round(sum(t["communityImpact"] for t in tweet_scores) / n)

                yield _ndjson_line({
                    "type": "final",
                    "credits_remaining": remaining,
                    "analysis": {
                        "username": username,
                        "displayName": twitter_user.get("name", username),
                        "avatarUrl": twitter_user.get("profile_image_url"),
                        "tweetCount": len(tweets),
                        "tweets": tweet_scores,
                        "aggregate": {
                            "overallScore": int(summary.get("overallScore", 0)),
                            "teachingValue": avg_teaching,
                            "originality": avg_originality,
                            "communityImpact": avg_impact,
                            "farmingPercentage": int(summary.get("farmingPercentage", 0)),
                            "genuinePercentage": round((genuine_count / n) * 100),
                            "strengths": summary.get("strengths", ""),
                            "weaknesses": summary.get("weaknesses", ""),
                            "verdict": summary.get("verdict", "ambiguous"),
                        },
                        "analyzedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    },
                })
            except ValueError as e:
                yield _ndjson_line({"type": "error", "message": str(e)})
            except Exception as e:
                logger.error("[JudgeScoreAccount] Error: %s", e)
                yield _ndjson_line({"type": "error", "message": "Account analysis failed"})

        return StreamingHttpResponse(
            stream(),
            content_type="application/x-ndjson; charset=utf-8",
            headers={"Cache-Control": "no-cache, no-transform"},
        )
