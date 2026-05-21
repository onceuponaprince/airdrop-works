from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("judge", "0002_scoringrubric_quest"),
    ]

    operations = [
        migrations.AddField(
            model_name="scoringrubric",
            name="key",
            field=models.SlugField(
                blank=True,
                help_text="Stable rubric identifier, e.g. performance_marketing_v1",
                max_length=64,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="scoringrubric",
            name="dimension_config",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Optional dimension schema for non-Web3 rubrics.",
            ),
        ),
    ]
