import pytest

from apps.judge.models import ScoringRubric
from apps.judge.rubric_spec import SPEC_VERSION, rubric_to_open_spec


@pytest.mark.django_db
def test_rubric_to_open_spec_marketing():
    rubric = ScoringRubric.objects.get(key="performance_marketing_v1")
    spec = rubric_to_open_spec(rubric)
    assert spec["key"] == "performance_marketing_v1"
    assert spec["specVersion"] == SPEC_VERSION
    assert len(spec["dimensions"]) == 5
    assert spec["dimensions"][0]["id"] == "hook"


@pytest.mark.django_db
def test_rubric_to_open_spec_contribution_weights():
    rubric, _ = ScoringRubric.objects.update_or_create(
        key="contribution_quality_v1",
        defaults={
            "name": "Contribution Quality v1",
            "is_default": True,
            "teaching_value_weight": 0.4,
            "originality_weight": 0.3,
            "community_impact_weight": 0.3,
        },
    )
    spec = rubric_to_open_spec(rubric)
    assert spec["key"] == "contribution_quality_v1"
    assert "signals" in spec
    ids = {d["id"] for d in spec["dimensions"]}
    assert ids == {"teaching_value", "originality", "community_impact"}
