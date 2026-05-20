# Phase 2 Checklist

Status key: `[x]` done, `[ ]` pending

## Done
- [x] Backend CI and focused backend validation are in place.
- [x] Judge fallback scoring exists for demo/free traffic.
- [x] Payout approvals are DB-backed and admin-manageable.
- [x] Payout approval flow is tested without network calls.

## Done (moved from Remaining)
- [x] Validate and document leaderboard rebuild operations.
- [x] Add alerting / monitoring notes for `leaderboard.rebuild_all`.
- [x] Finalize judge and leaderboard runbook coverage for launch.
- [x] Finish telemetry / release-readiness notes (Sentry, deployment checklist).
 
	- See `runbooks/telemetry.md` for steps and verification commands.

## Remaining
- [x] Decide UX and wallet polish follow-ups for launch. See [docs/wallet-ux-polish.md](docs/wallet-ux-polish.md).

- [x] Confirm the onchain reward pipeline scope beyond dry-run approval flow. See [docs/onchain-rewards-scope.md](docs/onchain-rewards-scope.md).

## Beyond Phase 2
- [ ] Decide whether heuristic fallback remains available outside demo/emergency mode.
- [ ] Decide if judge scoring needs a dedicated queue / service boundary.
- [ ] Add an admin-facing cost dashboard for API and credit visibility.

Decisions (recommended):
- Heuristic fallback: keep disabled by default in production; enable via feature flag for demos/emergency only. **Owner:** eng-lead.
- Judge scoring queue: recommend dedicated Celery queue/worker for judge scoring to isolate CPU/latency and prevent interference with critical tasks. **Owner:** infra.
- Admin cost dashboard: implement Grafana panels for API/credit visibility as Phase 2 quick-win; plan a dedicated admin UI in Phase 3. **Owner:** finance + frontend.

---

Execution artifacts created:

- `TASKS_PHASE2.md` — detailed subtasks, owners, and estimates ([TASKS_PHASE2.md](TASKS_PHASE2.md)).
- `runbooks/alerts/prometheus_leaderboard_alert.yaml` — PrometheusRule snippet for `leaderboard.rebuild_all` monitoring.
