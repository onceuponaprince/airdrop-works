# Phase 2 complete

**Release line:** `0.2.5` (platform-ready) → `0.3.0` (Wave 1) → `0.3.1` (Wave 2) → **`0.3.2`** (Wave 3)

## What shipped

| Wave | Deliverables |
|------|----------------|
| 0 | `PHASE_2_PREP.md`, `PHASE_2_VERIFICATION.md`, verify scripts |
| 1 | Integrity API, crawl hardening, payout idempotency + executor boundary |
| 2 | Heuristic flag, wallet UX, monitoring runbooks |
| 3 | `verify_phase2_gate.sh`, `phase2_pilot_smoke.sh`, CI test slice, sign-off |

## Verify locally

```bash
./scripts/bootstrap_platform.sh
docker compose exec backend uv run python manage.py seed_demo
./scripts/verify_phase2_gate.sh
./scripts/phase2_pilot_smoke.sh
```

## PRs

- [#13](https://github.com/onceuponaprince/airdrop-works/pull/13) — Wave 1
- [#14](https://github.com/onceuponaprince/airdrop-works/pull/14) — Wave 2
- Wave 3 — PR in this release

## Beyond Phase 2

See `PHASE_2_CHECKLIST.md` § Beyond Phase 2 and `research/airdrop-direction/decisions/001-sequenced-roadmap.md` for product Phase 3+.
