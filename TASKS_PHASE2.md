# Phase 2 Execution Tasks

This file captures concrete steps to complete the remaining Phase 2 items and the "Beyond Phase 2" decisions. Assign owners, mark progress, and update this file as tasks complete.

## Remaining Phase 2

- [x] Decide UX and wallet polish follow-ups for launch. **Owner:** frontend-owner (assigned)
  Decision: Run the UX walkthrough and produce the prioritized polish list. **Owner:** frontend-owner
  - First step: schedule a 1-hour UX walkthrough covering onboarding, wallet connect, and reward claim flows.
  - Outputs: prioritized 3-item polish list with acceptance criteria (wallet connect success across MetaMask/WalletConnect, clear claim CTA, gas estimation & confirmation UI).
  - Commands / artifacts: record session notes to `docs/wallet-ux-polish.md`, create issues for each fix, include acceptance test steps.
  - Est. effort: 1–2 days.
  - Tickets created: [UX Walkthrough ticket](docs/tickets/001-ux-walkthrough.md), [Wallet connect reliability](docs/tickets/002-ux-wallet-connect.md), [Claim CTA polishing](docs/tickets/003-ux-claim-cta.md), [Gas estimation UI](docs/tickets/004-ux-gas-ui.md).

- [ ] Confirm the onchain reward pipeline scope beyond dry-run approval flow. **Owner:** backend-owner / web3-owner (unassigned)
  Decision: Staged, guarded rollout with idempotency keys, cost guardrails, and monitoring. **Owner:** backend-owner / web3-owner
  - First step: document current dry-run flow and locate code paths. See `backend/apps/rewards/` and `backend/scripts` for dry-run hooks; record to `docs/onchain-rewards-scope.md`.
  - Subtasks:
    - Identify payment execution boundary and idempotency requirements.
    - Define gas/cost guardrails and monitoring requirements (integrate with Prometheus/Grafana and billing signals).
    - Implement execution worker/queue and circuit breaker for cost spikes.
    - Add end-to-end test plan and a staging dry-run with simulated txs.
  - Tickets created: [Idempotency DB schema](docs/tickets/005-onchain-idempotency.md), [Onchain executor worker](docs/tickets/006-onchain-executor.md), [KMS signing integration](docs/tickets/007-onchain-signing.md), [Guardrails & circuit breaker](docs/tickets/008-onchain-guardrails.md), [E2E staging tests](docs/tickets/009-onchain-e2e.md), [Monitoring & alerts](docs/tickets/010-onchain-monitoring.md).
  - Deliverable: `docs/onchain-rewards-scope.md` + test plan and prototype.
  - Est. effort: 2–4 days.

## Beyond Phase 2 (decision tasks)

- [ ] Decide whether heuristic fallback remains available outside demo/emergency mode. **Owner:** eng-lead (unassigned)
  Decision (recommended): keep heuristic fallback disabled by default in production; enable via feature flag for demos/emergency only. **Owner:** eng-lead
  - First step: run a 7–14 day false-positive analysis and document findings.
  - Deliverable: recommendation (keep/remove) with data and rollback plan.

- [ ] Decide if judge scoring needs a dedicated queue / service boundary. **Owner:** infra (unassigned)
  Decision (recommended): provision a dedicated Celery queue/worker for judge scoring to isolate resource usage and protect critical tasks. **Owner:** infra
  - First step: run load profile of judge scoring under expected launch traffic; estimate latencies and cost.
  - Deliverable: design doc with trade-offs and phased rollout plan.

- [ ] Add an admin-facing cost dashboard for API and credit visibility. **Owner:** finance + frontend (unassigned)
  Decision: prototype Grafana panels in staging for API/credit visibility as a Phase 2 quick-win; plan dedicated admin UI in Phase 3. **Owner:** finance + frontend
  - First step: surface metrics (API calls, credits used) in staging Grafana; prototype a dashboard panel.
  - Deliverable: dashboard and admin RBAC docs.

## Automation / Monitoring artifacts added

- `runbooks/alerts/prometheus_leaderboard_alert.yaml` — PrometheusRule snippet for detecting stale or failed `leaderboard.rebuild_all`.

## How to mark tasks done

Edit this file and replace `[ ]` with `[x]`, and add a one-line note with PR/commit or ticket reference.
