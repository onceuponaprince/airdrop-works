# 009 — E2E staging tests for onchain payouts

Owner: backend-owner / web3-owner
Estimate: 1–2 days

Description:
- Implement E2E tests on a testnet or local fork validating happy path, retries, idempotency, and circuit breaker behavior.

Tasks:
- Create staging environment with funded test account.
- Write tests for single payout, batched payouts, retry semantics, idempotency, and circuit breaker triggers.
- Run tests and record results.

Acceptance:
- E2E suite passes in staging and validates idempotency and retry behavior.

Status: open
