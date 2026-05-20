# 006 — Onchain executor worker

Owner: backend-owner
Estimate: 1–2 days

Description:
- Implement a separate `onchain-executor` Celery worker/queue to perform signed transaction submission in an isolated boundary.

Tasks:
- Create Celery queue `onchain-executor` and worker config.
- Implement worker that acquires DB lease, constructs tx, writes idempotency key, signs via configured signer, and broadcasts.
- Add pause/resume controls and health checks.

Acceptance:
- Executor can be paused remotely and records tx hash on success.

Status: open
