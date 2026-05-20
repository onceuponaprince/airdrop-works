from unittest.mock import patch

from django.test import override_settings

from apps.ai_core.service import AICoreScoringService


@override_settings(ANTHROPIC_API_KEY="")
@patch("apps.ai_core.heuristics.random.randint", return_value=7)
def test_score_text_uses_heuristic_fallback_when_api_key_is_missing(mock_randint):
    result = AICoreScoringService.score_text("This tutorial explains how to build a useful community tool.")

    assert result.composite_score == 57
    assert result.farming_flag in {"genuine", "ambiguous", "farming"}
    assert result.dimension_explanations["teaching_value"]
    mock_randint.assert_called_once_with(-10, 10)