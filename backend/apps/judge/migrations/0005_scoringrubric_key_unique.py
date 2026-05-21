from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("judge", "0004_seed_performance_marketing_rubric"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="scoringrubric",
            constraint=models.UniqueConstraint(
                condition=models.Q(key__isnull=False),
                fields=("key",),
                name="uniq_scoring_rubric_key",
            ),
        ),
    ]
