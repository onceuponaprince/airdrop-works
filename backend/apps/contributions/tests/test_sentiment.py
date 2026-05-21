from apps.contributions.sentiment import analyze_sentiment


def test_sentiment_positive():
    result = analyze_sentiment("This is great and helpful, love the launch")
    assert result["label"] == "positive"
    assert result["score"] > 0


def test_sentiment_negative():
    result = analyze_sentiment("This is a scam and terrible rug fail")
    assert result["label"] == "negative"
    assert result["score"] < 0


def test_sentiment_neutral_empty():
    result = analyze_sentiment("")
    assert result["label"] == "neutral"
