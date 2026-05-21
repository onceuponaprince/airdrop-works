from django.db import migrations


def seed_contribution_key(apps, schema_editor):
    ScoringRubric = apps.get_model("judge", "ScoringRubric")
    default = ScoringRubric.objects.filter(is_default=True).first()
    if not default:
        default = ScoringRubric.objects.order_by("created_at").first()
    if not default:
        return
    if default.key:
        return
    default.key = "contribution_quality_v1"
    if not default.dimension_config:
        default.dimension_config = {
            "dimensions": [
                {"id": "teaching_value", "weight": 0.333, "label": "Teaching Value"},
                {"id": "originality", "weight": 0.333, "label": "Originality"},
                {"id": "community_impact", "weight": 0.334, "label": "Community Impact"},
            ]
        }
    default.save(update_fields=["key", "dimension_config"])


class Migration(migrations.Migration):

    dependencies = [
        ("judge", "0005_scoringrubric_key_unique"),
    ]

    operations = [
        migrations.RunPython(seed_contribution_key, migrations.RunPython.noop),
    ]
