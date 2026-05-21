"""Idempotency helpers for onchain payout execution."""


def payout_idempotency_key(approval_id: int, schema_version: int = 1) -> str:
    return f"payout:{approval_id}:v{schema_version}"
