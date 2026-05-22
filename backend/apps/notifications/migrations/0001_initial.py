"""Initial migration for notifications app."""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "notification_type",
                    models.CharField(
                        choices=[
                            ("score_complete", "Score Complete"),
                            ("appeal_resolved", "Appeal Resolved"),
                            ("quest_completed", "Quest Completed"),
                            ("loot_ready", "Loot Ready"),
                            ("quest_accepted", "Quest Accepted"),
                            ("badge_earned", "Badge Earned"),
                            ("rank_up", "Rank Up"),
                            ("system", "System"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("message", models.TextField()),
                ("read", models.BooleanField(db_index=True, default=False)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("data", models.JSONField(blank=True, default=dict)),
                ("is_broadcast", models.BooleanField(db_index=True, default=False)),
                ("deleted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "notifications",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "read", "-created_at"],
                        name="notificatio_user_id_8f0e3e_idx",
                    ),
                    models.Index(
                        fields=["user", "notification_type", "-created_at"],
                        name="notificatio_user_id_9a1b2c_idx",
                    ),
                    models.Index(
                        fields=["is_broadcast", "-created_at"],
                        name="notificatio_is_broa_7d4e5f_idx",
                    ),
                ],
            },
        ),
    ]
