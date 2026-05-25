from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="onboarding_completed",
            field=models.BooleanField(
                default=False,
                help_text="True once the user finishes or skips social-only onboarding.",
            ),
        ),
        migrations.AddField(
            model_name="profile",
            name="preferred_branch",
            field=models.CharField(
                blank=True,
                choices=[
                    ("educator", "Educator"),
                    ("builder", "Builder"),
                    ("creator", "Creator"),
                    ("scout", "Scout"),
                    ("diplomat", "Diplomat"),
                ],
                default="",
                help_text="User-selected branch during onboarding (used until XP accrues).",
                max_length=16,
            ),
        ),
    ]
