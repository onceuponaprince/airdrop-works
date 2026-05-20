# Onchain Rewards Scope — from Dry-Run to Staged Rollout

Owners: backend-owner, web3-owner

Purpose
- Document the existing dry-run approval flow, enumerate integration points, and define the requirements and implementation plan to move from dry-run to a guarded onchain rollout with idempotency, cost guardrails, and monitoring.

Current dry-run summary
- Approvals are created and stored in DB; payout approval flow executes simulated transactions (dry-run) without broadcasting to network. Signing keys and execution are intentionally not exercised during dry-run.

Integration points to document
- Executor: component that constructs and signs transactions.
- Queue: worker queue (recommended: Celery) that performs onchain execution.
- Signing key management: where private keys are stored/used (HSM/KMS recommended), rotation policy, and access controls.
- Admin UI / approvals DB: where approvals are staged and reviewed.
- Telemetry & monitoring: events emitted for attempt/submit/success/failure and gas/cost metrics.

Requirements for staged rollout
1) Idempotency
  - Define idempotency key per logical payout (example format: `payout:{approval_id}:v{schema_version}`).
  - Worker must record tx hash + idempotency key atomically to prevent double-send.

2) Execution boundary
  - Implement a separate execution worker / Celery queue `onchain-executor`.
  - Worker reads approved payouts, acquires a lease (DB row lock or distributed lock), then constructs & signs tx.

3) Cost guardrails & circuit breaker
  - Add gas/cost limits in configs: per-tx max gas price, per-batch dollar limit, and a global daily spend cap.
  - Circuit breaker: if total failed gas spend or unexpected drain > threshold, pause executor and alert.

4) Retry semantics & failure handling
  - Non-idempotent failures (e.g., nonce mismatch): record failure and escalate to manual review with suggested remediation steps.
  - Transient errors (RPC timeouts): retry with exponential backoff (max 3 attempts) and bounded total gas spend.
  - On success: mark approval executed, store tx hash, emit telemetry event `reward.sent` with metadata.

5) Signing key & rotation
  - Use KMS or HSM-backed signing where available; do not store raw private keys in plain files.
  - Define rotation cadence and emergency key revoke steps.

6) E2E staging test plan
  - Staging environment connected to a testnet (or local fork) with dedicated test signing key and funded account.
  - Tests: happy path (single payout), batched payouts, retry on transient RPC failure, idempotency verification (replay same approval → no double-send), circuit breaker trigger (simulate high-cost gas).

7) Monitoring & alerting
  - Emit metrics: payouts_attempted, payouts_success, payouts_failed, gas_spent_total, average_gas_per_tx.
  - Alert on: sudden increase in failures, daily gas spend > 80% of guardrail, repeated nonce errors.

Subtasks (implementation order)
1. Document dry-run flow and integration points (this file).
2. Add idempotency key schema and DB column `tx_idempotency_key` + unique index.
3. Implement `onchain-executor` Celery worker and separate queue.
4. Wire signing via KMS/HSM, or a secure secrets-backed signing service for prototype.
5. Add gas/cost guardrail config and circuit breaker with Prometheus/Grafana panels & alert rules.
6. Implement retry/failure handling and record patterns for manual remediation.
7. Create staging E2E tests and run on testnet/fork.

Estimate
- 2–4 days for spike + prototype to implement core idempotency and executor boundary; additional work for KMS integration and monitoring configuration may extend effort.

Acceptance criteria (Phase 2)
- Idempotency: re-processing the same approval does not produce a second onchain tx.
- Execution boundary: executor runs in a separate worker and can be paused remotely.
- Guardrails: gas/cost limits applied and circuit breaker triggers under simulated overload.
- Tests: E2E staging test suite validates retry semantics and idempotency.

Next steps
- Create tickets for the subtasks above and implement in dependency order. Add concrete thresholds (dollar limits, gas price caps) as part of the spike.
# Onchain Rewards Scope (Draft)

Purpose: document the current dry-run approval flow and define the production rollout scope for onchain reward execution.

Current state:
- Dry-run approval flow exists in `backend/apps/rewards/` and `backend/scripts` (search for `dry_run` flags).
- Execution currently simulated; no signer-based production exec in mainline.

Goals for production rollout:
- Define the execution boundary (service or worker responsible for signing and broadcasting txs).
- Ensure idempotency: assign idempotency keys per reward action to prevent double spends.
- Implement cost guardrails: max gas per batch, circuit breaker for sudden cost spikes.
- Design monitoring and billing signals: Prometheus metrics, Grafana dashboard, and alerting for abnormal spend.
- Create E2E staging tests that simulate txs (using testnets or mock signer) before enabling prod.

Deliverables:
- `docs/onchain-rewards-scope.md` (this file) updated with code links and diagrams.
- Prototype worker or queue configuration (Celery queue or separate service).
- Test plan and rollback procedure.

Next steps:
- Inventory code paths that emit rewards and link them here.
- Add a small sequence diagram showing flow (approval -> executor -> signer -> broadcast -> verify).
- Assign `backend-owner` and `web3-owner` to implement spike/prototype.
