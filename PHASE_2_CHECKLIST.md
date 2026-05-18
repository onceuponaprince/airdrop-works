# Phase 2 Checklist

Status key: `[x]` done, `[ ]` pending

## Done
- [x] Backend CI and focused backend validation are in place.
- [x] Judge fallback scoring exists for demo/free traffic.
- [x] Payout approvals are DB-backed and admin-manageable.
- [x] Payout approval flow is tested without network calls.

## Remaining
- [x] Validate and document leaderboard rebuild operations.
- [x] Add alerting / monitoring notes for `leaderboard.rebuild_all`.
- [x] Finalize judge and leaderboard runbook coverage for launch.
- [x] Finish telemetry / release-readiness notes (Sentry, deployment checklist).  
	- See `runbooks/telemetry.md` for steps and verification commands.
- [ ] Decide UX and wallet polish follow-ups for launch.
- [ ] Confirm the onchain reward pipeline scope beyond dry-run approval flow.

## Beyond Phase 2
- [ ] Decide whether heuristic fallback remains available outside demo/emergency mode.
- [ ] Decide if judge scoring needs a dedicated queue / service boundary.
- [ ] Add an admin-facing cost dashboard for API and credit visibility.
