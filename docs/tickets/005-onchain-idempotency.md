# 005 — Idempotency DB schema

Owner: backend-owner
Estimate: 0.5–1 day

Description:
- Add `tx_idempotency_key` column to payouts/approvals table and a unique index to prevent double-send. Define key format and schema versioning.

Tasks:
- DB migration to add column and index.
- Update payout worker to write idempotency key and check before sending.
- Add unit tests validating idempotency.

Acceptance:
- Replaying the same approval does not create a second onchain tx in staging.

Status: open
