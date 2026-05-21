from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("approvals", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="airdroppayoutapproval",
            name="tx_idempotency_key",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="Logical payout key to prevent double-send (payout:{id}:v1).",
                max_length=128,
            ),
        ),
        migrations.AddField(
            model_name="airdroppayoutapproval",
            name="tx_hash",
            field=models.CharField(blank=True, default="", max_length=66),
        ),
        migrations.AddField(
            model_name="airdroppayoutapproval",
            name="executed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name="airdroppayoutapproval",
            constraint=models.UniqueConstraint(
                condition=~models.Q(tx_idempotency_key=""),
                fields=("tx_idempotency_key",),
                name="uniq_payout_idempotency_key",
            ),
        ),
    ]
