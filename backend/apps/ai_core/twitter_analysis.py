"""Twitter/SNS ingestion and comparative analysis helpers."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from statistics import mean
from typing import Any, Literal

import httpx

from .service import AICoreScoringService


AnalysisMode = Literal["keyword", "account"]


@dataclass(frozen=True)
class TwitterPostAnalysis:
    id: str
    text: str
    engagement_score: float
    sentiment: str
    why_it_did_well: str
    user_score: dict[str, Any]


def _sentiment_score(text: str) -> tuple[str, float]:
    positive_tokens = {
        "great", "good", "love", "awesome", "useful", "helpful", "smart",
        "win", "wins", "better", "best", "amazing", "insight", "learn",
    }
    negative_tokens = {
        "bad", "hate", "terrible", "scam", "spam", "useless", "broken",
        "angry", "worse", "worst", "sucks", "fail", "failure",
    }
    lowered = text.lower()
    positive_hits = sum(1 for token in positive_tokens if token in lowered)
    negative_hits = sum(1 for token in negative_tokens if token in lowered)
    score = positive_hits - negative_hits
    if score > 0:
        return "positive", min(1.0, score / 4)
    if score < 0:
        return "negative", max(-1.0, score / 4)
    return "neutral", 0.0


def _why_it_went_well(text: str, engagement_score: float) -> str:
    lowered = text.lower()
    reasons: list[str] = []
    if any(token in lowered for token in ("how to", "guide", "tutorial", "thread", "explainer")):
        reasons.append("educational framing")
    if any(token in lowered for token in ("build", "ship", "launch", "release", "tool", "tooling")):
        reasons.append("builder relevance")
    if any(token in lowered for token in ("why", "what if", "hot take", "unpopular opinion", "here's why")):
        reasons.append("strong hook or contrarian angle")
    if lowered.count("#") >= 2:
        reasons.append("discoverability via hashtags")
    if "?" in text:
        reasons.append("question-driven curiosity")
    if engagement_score > 100:
        reasons.append("high engagement velocity")
    if not reasons:
        reasons.append("clear topical relevance")
    return "; ".join(reasons)


def _engagement_score(post: dict[str, Any]) -> float:
    metrics = post.get("public_metrics") or post.get("metrics") or {}
    likes = float(metrics.get("like_count", metrics.get("likes", 0)) or 0)
    retweets = float(metrics.get("retweet_count", metrics.get("retweets", 0)) or 0)
    replies = float(metrics.get("reply_count", metrics.get("replies", 0)) or 0)
    quotes = float(metrics.get("quote_count", metrics.get("quotes", 0)) or 0)
    impressions = float(metrics.get("impression_count", metrics.get("views", 0)) or 0)
    return likes + (retweets * 2.0) + (quotes * 1.5) + (replies * 0.5) + (impressions * 0.01)


def _rank_posts(posts: list[dict[str, Any]], top_n: int) -> list[dict[str, Any]]:
    ranked = sorted(posts, key=_engagement_score, reverse=True)
    return ranked[:top_n]


def _fetch_keyword_posts(keyword: str, bearer_token: str, limit: int) -> list[dict[str, Any]]:
    url = (
        "https://api.twitter.com/2/tweets/search/recent"
        f"?query={httpx.QueryParams({'q': keyword})['q']}"
        f"&max_results={min(limit, 100)}"
        "&tweet.fields=public_metrics,created_at,author_id"
    )
    response = httpx.get(url, headers={"Authorization": f"Bearer {bearer_token}"}, timeout=15)
    response.raise_for_status()
    return response.json().get("data", [])


def _fetch_account_posts(username: str, bearer_token: str, limit: int) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    user_response = httpx.get(
        f"https://api.twitter.com/2/users/by/username/{username}?user.fields=public_metrics,verified,description,profile_image_url",
        headers={"Authorization": f"Bearer {bearer_token}"},
        timeout=15,
    )
    user_response.raise_for_status()
    user = user_response.json().get("data", {})
    tweets_response = httpx.get(
        f"https://api.twitter.com/2/users/{user.get('id')}/tweets"
        f"?max_results={min(limit, 100)}"
        "&tweet.fields=public_metrics,created_at,author_id"
        "&exclude=retweets,replies",
        headers={"Authorization": f"Bearer {bearer_token}"},
        timeout=15,
    )
    tweets_response.raise_for_status()
    return user, tweets_response.json().get("data", [])


def analyze_twitter_sns_data(
    *,
    keyword_or_account: str,
    current_user_text: str,
    current_user_account_text: str = "",
    mode: AnalysisMode = "keyword",
    bearer_token: str = "",
    top_n: int = 5,
    post_fetcher: Any | None = None,
) -> dict[str, Any]:
    """Ingest Twitter/X data and compare it against the current user's content.

    Returns a structured dict containing the top posts, sentiment summary, why
    the posts/account performed well, and deltas versus the current user's content.
    """
    if post_fetcher is None:
        if not bearer_token:
            raise ValueError("bearer_token is required when no post_fetcher is provided")
        if mode == "account":
            account_profile, posts = _fetch_account_posts(keyword_or_account.lstrip("@"), bearer_token, top_n * 3)
        else:
            account_profile, posts = {}, _fetch_keyword_posts(keyword_or_account, bearer_token, top_n * 3)
    else:
        fetched = post_fetcher(keyword_or_account=keyword_or_account, mode=mode, top_n=top_n)
        if isinstance(fetched, tuple):
            account_profile, posts = fetched
        else:
            account_profile, posts = {}, fetched

    ranked_posts = _rank_posts(posts, top_n)
    post_analyses: list[TwitterPostAnalysis] = []
    sentiments: list[float] = []
    scores: list[int] = []

    for post in ranked_posts:
        text = str(post.get("text", "")).strip()
        sentiment_label, sentiment_score = _sentiment_score(text)
        engagement_score = _engagement_score(post)
        user_score = AICoreScoringService.score_text(text, quota_context=None).to_dict()
        sentiments.append(sentiment_score)
        scores.append(int(user_score.get("composite_score", 0)))
        post_analyses.append(
            TwitterPostAnalysis(
                id=str(post.get("id", "")),
                text=text,
                engagement_score=engagement_score,
                sentiment=sentiment_label,
                why_it_did_well=_why_it_went_well(text, engagement_score),
                user_score=user_score,
            )
        )

    current_user_score = AICoreScoringService.score_text(current_user_text, quota_context=None).to_dict()
    account_score = AICoreScoringService.score_text(current_user_account_text or current_user_text, quota_context=None).to_dict()

    top_avg_score = round(mean(scores), 2) if scores else 0.0
    sentiment_average = round(mean(sentiments), 2) if sentiments else 0.0

    account_fame_reasons: list[str] = []
    if account_profile:
        metrics = account_profile.get("public_metrics") or {}
        followers = metrics.get("followers_count") or 0
        if followers >= 100000:
            account_fame_reasons.append("large follower base")
        if account_profile.get("verified"):
            account_fame_reasons.append("verified presence")
    if top_avg_score >= 70:
        account_fame_reasons.append("high-performing recent posts")
    if not account_fame_reasons:
        account_fame_reasons.append("clear topical relevance and repeatable hooks")

    return {
        "mode": mode,
        "query": keyword_or_account,
        "account": account_profile,
        "top_posts": [asdict(item) for item in post_analyses],
        "sentiment": {
            "average": sentiment_average,
            "label": "positive" if sentiment_average > 0.15 else "negative" if sentiment_average < -0.15 else "neutral",
        },
        "why_it_worked": "; ".join(account_fame_reasons),
        "current_user": {
            "content_score": current_user_score,
            "account_score": account_score,
        },
        "comparison": {
            "user_vs_top_avg_composite": int(current_user_score.get("composite_score", 0)) - int(top_avg_score),
            "user_vs_top_avg_teaching": int(current_user_score.get("teaching_value", 0)) - (round(mean([p.user_score["teaching_value"] for p in post_analyses]), 2) if post_analyses else 0),
            "user_vs_top_avg_originality": int(current_user_score.get("originality", 0)) - (round(mean([p.user_score["originality"] for p in post_analyses]), 2) if post_analyses else 0),
            "user_vs_top_avg_community": int(current_user_score.get("community_impact", 0)) - (round(mean([p.user_score["community_impact"] for p in post_analyses]), 2) if post_analyses else 0),
        },
        "account_fame_reasons": account_fame_reasons,
    }
