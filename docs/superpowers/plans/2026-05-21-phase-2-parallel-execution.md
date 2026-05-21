# Phase 2 Parallel Execution — Implementation Plan

> **For agentic workers:** Execute wave-by-wave; one atomic commit per service after its gate passes. PR → merge → version bump at phase end (target `0.3.0`).

**Goal:** Move from “logged-in app works” (0.2.5) to **automated contribution scoring**, **B2B integrity export**, and **guarded onchain payout boundary** — launch-ready for pilots.

**Prereq:** `docs/PLATFORM_READY.md` smoke passes (SIWE/dev login, platform judge, dashboard history, Celery optional).

**Architecture:** Six logical services across 4 waves; parallel lanes per wave with merge gates (same pattern as Phase 1).

**Tech stack:** Celery + Redis, Django 5 / DRF, Next.js 14, Particle + wagmi SIWE, Hardhat dry-run payouts, Prometheus/Grafana notes.

**Product north star (roadmap):** Phase 2 = *Passport filters humans; we filter farmers and score contribution quality* — API-first reputation export for pilots.

---

## Wave 0 — Contract freeze & baseline

| Item | Owner lane | Deliverable |
|------|------------|-------------|
| API contract | verifySvc | `docs/PHASE_2_VERIFICATION.md` |
| Baseline gate | verifySvc | `./scripts/bootstrap_platform.sh` + `./scripts/verify_phase2_endpoints.sh` green |
| Kickoff doc | — | `docs/PHASE_2_PREP.md` (env + roles) |

**Gate:** Platform smoke (login → judge → dashboard) + Phase 1 script still passes.

```bash
./scripts/bootstrap_platform.sh   # or docker compose up per PLATFORM_READY
./scripts/verify_phase1_endpoints.sh
./scripts/verify_phase2_endpoints.sh
```

---

## Wave 1 — Automation & integrity (parallel)

### ingestOps
- [x] Document Celery beat schedule for `crawl_source_config_task` in `runbooks/ingestion.md`
- [x] Harden `crawl_source_config_task` failure surface (`last_error`, bounded retries) — verify in `apps/contributions/tests/test_tasks.py`
- [x] Sources UI: surface `last_error` + “last crawl” on `/sources` (read-only if already in serializer)
- [x] Integration test: mock crawler → new `Contribution` → `score_contribution_task` enqueued

**Commit message:** `feat(ingest): harden crawl→score ops and runbook`

### integrityApi
- [x] `GET /api/v1/integrity/{wallet_address}/` — dimension scores, `farming_flag`, `farmingPercentage`, composite, sample size
- [x] Staff-only `GET /api/v1/integrity/export/?format=json|csv` for pilot allocation dumps (rate-limited)
- [x] Tests in `apps/integrity/tests/`

**Commit message:** `feat(integrity): wallet reputation bundle + export`

### onchainBoundary
- [x] Add `tx_idempotency_key` + unique index on payout approval model (see `docs/onchain-rewards-scope.md`)
- [x] Celery queue `onchain-executor` + no-op worker (logs only, no broadcast)
- [x] `payout_batch --dry-run` documents idempotency key in stdout

**Commit message:** `feat(rewards): onchain executor boundary + idempotency schema`

**Wave 1 gate:**

```bash
docker compose run --rm backend uv run pytest \
  apps/contributions/tests/test_tasks.py \
  apps/rewards/tests/ -q
# + new integrity tests when added
```

---

## Wave 2 — UX, policy, monitoring (parallel)

### uxPolish
- [x] Close top 3 items from `docs/wallet-ux-polish.md` / tickets `001`–`004` (connect errors, claim CTA, gas confirm threshold)
- [x] Analytics events for wallet connect success/fail (`frontend/src/lib/analytics.ts`)

**Commit message:** `fix(frontend): wallet UX polish for launch`

### policyFlags
- [x] `JUDGE_HEURISTIC_FALLBACK_ENABLED` (default off in production settings)
- [x] Dedicated Celery queue `judge` for `score_contribution_task` + route in `config/celery.py`
- [x] Document rollout in `runbooks/judge.md`

**Commit message:** `feat(judge): heuristic flag + dedicated scoring queue`

### monitoring
- [x] Extend `runbooks/telemetry.md` with judge credit + crawl failure metrics list
- [x] Grafana panel spec (markdown) for API credits + `leaderboard.rebuild_all` staleness
- [x] Wire existing `runbooks/alerts/prometheus_leaderboard_alert.yaml` into deploy notes

**Commit message:** `docs(ops): phase 2 monitoring panels and alerts`

**Wave 2 gate:**

```bash
cd frontend && pnpm lint && pnpm build
docker compose run --rm backend uv run pytest apps/judge/tests/test_views.py -q
```

---

## Wave 3 — Verification & release

### verifySvc
- [ ] `scripts/verify_phase2_endpoints.sh` — integrity + crawl sources + health
- [ ] `docs/PHASE_2_VERIFICATION.md` checklist signed off
- [ ] Update `PHASE_2_CHECKLIST.md` / `TASKS_PHASE2.md` checkboxes

### e2ePilot
- [ ] Manual pilot script: connect source → wait for crawl → score appears on dashboard → export CSV
- [ ] Record in `docs/PHASE_2_VERIFICATION.md` § Pilot smoke

**Final gate:**

```bash
./scripts/verify_phase1_endpoints.sh
./scripts/verify_phase2_endpoints.sh
pnpm lint && pnpm build
docker compose run --rm backend uv run pytest apps/judge apps/contributions apps/rewards -q
```

**Release:** conventional commits → PR → merge → bump `0.3.0` + `CHANGELOG.md`.

---

## Parallel dispatch map

```
Wave 0 (serial)     → contract + baseline
Wave 1 (parallel)   → ingestOps | integrityApi | onchainBoundary
Wave 2 (parallel)   → uxPolish | policyFlags | monitoring
Wave 3 (serial)     → verifySvc + e2ePilot + version bump
```

**Team of three (optional):** coder implements one lane; reviewer runs gate; e2e runs pilot script — report file names + pass/fail only.

---

## Explicitly out of scope (Phase 3+)

- Solana wallet / donations (`useDonate.ts` TODO)
- Marketing-judge subdomain / `performance_marketing_v1` rubric
- Live mainnet payout broadcast (staging/testnet only until guardrails proven)
- Full Spore graph ingestion (Kafka, niche registers) — track in `spore-build-plan.md`, not this phase

---

## Reference artifacts

| Doc | Purpose |
|-----|---------|
| `docs/PLATFORM_READY.md` | 0.2.5 app bootstrap |
| `docs/onchain-rewards-scope.md` | Payout rollout requirements |
| `docs/wallet-ux-polish.md` | UX acceptance criteria |
| `HANDOFF_PHASE_2_AND_BEYOND.md` | Legacy launch-hardening status |
| `research/airdrop-direction/decisions/001-sequenced-roadmap.md` | B2B Phase 2 positioning |
