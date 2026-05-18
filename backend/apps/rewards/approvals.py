from django.db import connection
from django.utils import timezone

TABLE_NAME = "rewards_airdrop_payout_approval"


def ensure_table_exists():
    with connection.cursor() as c:
        c.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
                id SERIAL PRIMARY KEY,
                batch_id VARCHAR(128),
                created_by INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                approved BOOLEAN DEFAULT false,
                approved_by INTEGER,
                approved_at TIMESTAMP WITH TIME ZONE,
                notes TEXT
            );
            """
        )


def has_approved(batch_id: str | None = None) -> bool:
    ensure_table_exists()
    with connection.cursor() as c:
        if batch_id:
            c.execute(f"SELECT 1 FROM {TABLE_NAME} WHERE approved IS TRUE AND batch_id = %s LIMIT 1", [batch_id])
        else:
            c.execute(f"SELECT 1 FROM {TABLE_NAME} WHERE approved IS TRUE LIMIT 1")
        return c.fetchone() is not None


def create_approval(batch_id: str | None = None, approved: bool = True, notes: str = "") -> int:
    ensure_table_exists()
    with connection.cursor() as c:
        approved_at = timezone.now() if approved else None
        c.execute(
            f"INSERT INTO {TABLE_NAME} (batch_id, approved, approved_at, notes) VALUES (%s, %s, %s, %s) RETURNING id",
            [batch_id, approved, approved_at, notes],
        )
        return c.fetchone()[0]
