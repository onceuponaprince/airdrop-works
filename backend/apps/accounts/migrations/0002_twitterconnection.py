import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="TwitterConnection",
            fields=[
                ("id", models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("twitter_user_id", models.CharField(db_index=True, max_length=64, unique=True)),
                ("twitter_username", models.CharField(db_index=True, max_length=32)),
                ("display_name", models.CharField(blank=True, default="", max_length=64)),
                ("avatar_url", models.URLField(blank=True, default="")),
                ("access_token", models.TextField()),
                ("refresh_token", models.TextField(blank=True, default="")),
                ("token_expires_at", models.DateTimeField(blank=True, null=True)),
                ("watch_enabled", models.BooleanField(default=True)),
                ("use_selenium_fallback", models.BooleanField(default=False)),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
                ("last_error", models.TextField(blank=True, default="")),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="twitter_connection",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "twitter_connections",
            },
        ),
    ]
