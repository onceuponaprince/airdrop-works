from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("quests", "0001_initial"),
        ("judge", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="scoringrubric",
            name="quest",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional campaign/quest this rubric applies to.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="scoring_rubrics",
                to="quests.quest",
            ),
        ),
    ]
