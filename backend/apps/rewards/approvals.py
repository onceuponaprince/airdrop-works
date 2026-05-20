from django.db import connection
from django.utils import timezone

TABLE_NAME = "rewards_airdrop_payout_approval"


def _orm_model_available():
    """Return the approvals model if available and its table exists, else None."""
    try:
        from django.apps import apps

        Approval = apps.get_model("approvals", "AirdropPayoutApproval")
    except Exception:
        return None

    # check table exists in DB to avoid ORM errors when migrations weren't applied
    try:
        tables = connection.introspection.table_names()
        if Approval._meta.db_table in tables:
            return Approval
    except Exception:
        return None
    return None


def ensure_table_exists():
    """Compatibility: only create table via raw SQL if ORM model is not available yet."""
    if _orm_model_available():
        return
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
    Approval = _orm_model_available()
    if Approval:
        qs = Approval.objects.filter(approved=True)
        if batch_id:
            qs = qs.filter(batch_id=batch_id)
        return qs.exists()

    ensure_table_exists()
    with connection.cursor() as c:
        if batch_id:
            c.execute(f"SELECT 1 FROM {TABLE_NAME} WHERE approved IS TRUE AND batch_id = %s LIMIT 1", [batch_id])
        else:
            c.execute(f"SELECT 1 FROM {TABLE_NAME} WHERE approved IS TRUE LIMIT 1")
        return c.fetchone() is not None


def create_approval(batch_id: str | None = None, approved: bool = True, notes: str = "", created_by_id: int | None = None) -> int:
    Approval = _orm_model_available()
    if Approval:
        approved_at = timezone.now() if approved else None
        obj = Approval.objects.create(
            batch_id=batch_id, approved=approved, approved_at=approved_at, notes=notes
        )
        # Optionally set created_by/approved_by if ids provided (do not error if not)
        if created_by_id:
            try:
                from django.contrib.auth import get_user_model

                User = get_user_model()
                user = User.objects.filter(id=created_by_id).first()
                if user:
                    obj.created_by = user
                    if approved:
                        obj.approved_by = user
                    obj.save()
            except Exception:
                pass
        return obj.id

    ensure_table_exists()
    with connection.cursor() as c:
        approved_at = timezone.now() if approved else None
        c.execute(
            f"INSERT INTO {TABLE_NAME} (batch_id, approved, approved_at, notes) VALUES (%s, %s, %s, %s) RETURNING id",
            [batch_id, approved, approved_at, notes],
        )
        return c.fetchone()[0]
