# Phase 2 prep — kickoff checklist

**Baseline:** `0.2.5` (platform-ready logged-in app).  
**Plan:** [`docs/superpowers/plans/2026-05-21-phase-2-parallel-execution.md`](superpowers/plans/2026-05-21-phase-2-parallel-execution.md)

## Before Wave 0

- [ ] `main` includes 0.2.5 platform work (`PLATFORM_READY.md`, SIWE, judge persistence)
- [ ] `.env` has `ANTHROPIC_API_KEY`, `SECRET_KEY`, Particle vars (or DEBUG dev-bypass)
- [ ] Docker stack: `db`, `redis`, `backend`, `celery`, `celery-beat`, `frontend`
- [ ] `docker compose exec backend uv run python manage.py seed_demo` (optional sample data)

## Roles for parallel lanes

| Lane | Primary paths | Skills |
|------|---------------|--------|
| ingestOps | `backend/apps/contributions/`, `frontend/src/app/(app)/sources/` | Celery, crawlers |
| integrityApi | new `integrity` routes or `judge` + `profiles` aggregation | DRF, export CSV |
| onchainBoundary | `backend/apps/rewards/`, `contracts/` | Celery queue, idempotency |
| uxPolish | `frontend/src/components/shared/`, login, claim flows | Particle, wagmi |
| policyFlags | `backend/config/settings/`, `config/celery.py` | Feature flags |
| monitoring | `runbooks/` | Prometheus/Grafana docs |

## Commands (copy-paste)

```bash
# Full platform bootstrap
./scripts/bootstrap_platform.sh

# Gates
./scripts/verify_phase1_endpoints.sh
./scripts/verify_phase2_endpoints.sh

# Focused backend during development
docker compose run --rm backend uv run pytest apps/contributions/tests/test_tasks.py -q
docker compose run --rm backend uv run pytest apps/judge/tests/test_views.py -q
```

## Success criteria (phase complete)

1. User connects a crawl source → Celery ingests → contribution scores → appears on dashboard without manual paste.
2. Staff can export integrity bundle (wallet → scores + farming) for a pilot.
3. Payout path stops at dry-run / no-op executor; idempotency key prevents double-send in tests.
4. `0.3.0` tagged with CHANGELOG entry and verification checklist signed.

## Open decisions (resolve in Wave 0 or Wave 2)

| Decision | Recommendation | Owner |
|----------|----------------|-------|
| Heuristic fallback in prod | Off by default; flag for demo/emergency | eng-lead |
| Judge scoring queue | Dedicated Celery `judge` queue | infra |
| Cost visibility | Grafana quick-win; admin UI Phase 3 | finance + frontend |
