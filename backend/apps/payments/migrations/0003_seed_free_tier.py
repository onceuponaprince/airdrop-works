"""Seed a free-tier UserSubscription for every existing user that doesn't have one."""

from django.db import migrations


def seed_free_tier(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    UserSubscription = apps.get_model("payments", "UserSubscription")
    existing_user_ids = set(
        UserSubscription.objects.values_list("user_id", flat=True)
    )
    to_create = [
        UserSubscription(
            user_id=uid,
            plan="free",
            status="active",
            monthly_credits=10,
            credits_remaining=10,
        )
        for uid in User.objects.values_list("id", flat=True)
        if uid not in existing_user_ids
    ]
    UserSubscription.objects.bulk_create(to_create)


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0002_credittransaction_usersubscription"),
    ]

    operations = [
        migrations.RunPython(seed_free_tier, migrations.RunPython.noop),
    ]
