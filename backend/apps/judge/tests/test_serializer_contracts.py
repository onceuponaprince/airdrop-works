import pytest

from apps.judge.models import ScoringRubric
from apps.judge.serializers import RubricSerializer


@pytest.mark.django_db
def test_rubric_serializer_outputs_camel_case_weights_and_weight_sum():
    rubric = ScoringRubric.objects.create(
        name="Community Quality",
        description="Reward quality",
        teaching_value_weight=0.5,
        originality_weight=0.25,
        community_impact_weight=0.25,
        custom_instructions="Prefer concrete examples.",
        is_default=True,
    )

    data = RubricSerializer(rubric).data

    assert data["teachingValueWeight"] == 0.5
    assert data["originalityWeight"] == 0.25
    assert data["communityImpactWeight"] == 0.25
    assert data["customInstructions"] == "Prefer concrete examples."
    assert data["isDefault"] is True
    assert data["weightSum"] == pytest.approx(1.0)
    assert "teaching_value_weight" not in data


@pytest.mark.django_db
def test_rubric_serializer_rejects_weights_outside_zero_to_one():
    serializer = RubricSerializer(data={
        "name": "Bad Rubric",
        "description": "Invalid",
        "teachingValueWeight": 1.2,
        "originalityWeight": 0.0,
        "communityImpactWeight": -0.2,
        "customInstructions": "",
        "isDefault": False,
    })

    assert not serializer.is_valid()
    assert "Each weight must be between 0.0 and 1.0" in str(serializer.errors)
