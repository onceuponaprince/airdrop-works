from django.db import migrations


def seed_marketing_rubric(apps, schema_editor):
    ScoringRubric = apps.get_model("judge", "ScoringRubric")
    ScoringRubric.objects.update_or_create(
        key="performance_marketing_v1",
        defaults={
            "name": "Performance Marketing v1",
            "description": "Hook, clarity, audience fit, CTA, and fatigue risk for ad copy.",
            "teaching_value_weight": 0.0,
            "originality_weight": 0.0,
            "community_impact_weight": 0.0,
            "custom_instructions": "",
            "is_default": False,
            "dimension_config": {
                "dimensions": [
                    {"id": "hook", "weight": 0.25, "label": "Hook"},
                    {"id": "clarity", "weight": 0.25, "label": "Clarity"},
                    {"id": "audience_fit", "weight": 0.20, "label": "Audience Fit"},
                    {"id": "cta_strength", "weight": 0.20, "label": "CTA Strength"},
                    {"id": "fatigue_risk", "weight": 0.10, "label": "Fatigue Risk", "invert": True},
                ]
            },
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("judge", "0003_scoringrubric_key_dimensions"),
    ]

    operations = [
        migrations.RunPython(seed_marketing_rubric, migrations.RunPython.noop),
    ]
