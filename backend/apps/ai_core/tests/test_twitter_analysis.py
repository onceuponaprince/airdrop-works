from apps.ai_core.service import AICoreScoringService


def test_analyze_twitter_sns_data_keyword_mode_uses_ranked_posts(monkeypatch):
    posts = [
        {
            "id": "a",
            "text": "A helpful tutorial thread on shipping better tools. #build #learn",
            "public_metrics": {"like_count": 40, "retweet_count": 8, "reply_count": 4, "quote_count": 2},
        },
        {
            "id": "b",
            "text": "Something useful and practical for builders.",
            "public_metrics": {"like_count": 90, "retweet_count": 12, "reply_count": 6, "quote_count": 1},
        },
    ]

    def fake_fetcher(**kwargs):
        return posts

    result = AICoreScoringService.analyze_twitter_sns_data(
        keyword_or_account="builder tools",
        current_user_text="My own useful builder update.",
        mode="keyword",
        post_fetcher=fake_fetcher,
        top_n=1,
    )

    assert result["mode"] == "keyword"
    assert result["query"] == "builder tools"
    assert len(result["top_posts"]) == 1
    assert result["top_posts"][0]["id"] == "b"
    assert result["account"] == {}
    assert result["why_it_worked"] == "clear topical relevance and repeatable hooks"


def test_analyze_twitter_sns_data_ranks_top_posts_and_compares_user_content(monkeypatch):
    posts = [
        {
            "id": "1",
            "text": "A detailed tutorial on building useful tools. #build",
            "public_metrics": {"like_count": 120, "retweet_count": 20, "reply_count": 8, "quote_count": 4},
        },
        {
            "id": "2",
            "text": "Hot take: why this release won. Curious?",
            "public_metrics": {"like_count": 80, "retweet_count": 12, "reply_count": 15, "quote_count": 3},
        },
        {
            "id": "3",
            "text": "spammy low effort post",
            "public_metrics": {"like_count": 5, "retweet_count": 0, "reply_count": 0, "quote_count": 0},
        },
    ]

    def fake_fetcher(**kwargs):
        return ({"public_metrics": {"followers_count": 120000}, "verified": True}, posts)

    result = AICoreScoringService.analyze_twitter_sns_data(
        keyword_or_account="airdrop works",
        current_user_text="A useful tutorial on shipping better builder tools.",
        current_user_account_text="Builder account focused on practical Web3 tooling.",
        mode="account",
        post_fetcher=fake_fetcher,
        top_n=2,
    )

    assert result["mode"] == "account"
    assert len(result["top_posts"]) == 2
    assert result["top_posts"][0]["id"] == "1"
    assert result["sentiment"]["label"] in {"positive", "neutral", "negative"}
    assert "current_user" in result
    assert "comparison" in result
    assert isinstance(result["comparison"]["user_vs_top_avg_composite"], int)
    assert "verified presence" in result["account_fame_reasons"]


def test_analyze_twitter_sns_data_requires_bearer_token_without_fetcher():
    try:
        AICoreScoringService.analyze_twitter_sns_data(
            keyword_or_account="builder tools",
            current_user_text="My own useful builder update.",
            mode="keyword",
        )
    except ValueError as exc:
        assert str(exc) == "bearer_token is required when no post_fetcher is provided"
    else:
        raise AssertionError("expected ValueError when bearer_token is missing")
