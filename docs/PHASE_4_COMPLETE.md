# Phase 4 complete

**Release line:** `0.4.0` (Phase 3) → **`0.5.0`** (Open Rubric / Data Coop)

## What shipped

| Wave | Deliverables |
|------|----------------|
| 0 | `PHASE_4_PREP.md`, `PHASE_4_VERIFICATION.md`, verify scripts |
| 1 | JSON Schema v1, canonical rubric JSON, catalog API, `contribution_quality_v1` seed |
| 2 | `tools/rubric-eval`, `/developers/rubrics`, governance + data coop docs |
| 3 | `verify_phase4_gate.sh`, sign-off, **0.5.0** |

## Verify locally

```bash
docker compose up -d db redis backend frontend
./scripts/verify_phase4_gate.sh
```

## PR

- [#17](https://github.com/onceuponaprince/airdrop-works/pull/17) — Phase 4 Open Rubric

## Beyond Phase 4

Phase 5 portable reputation network — see `research/airdrop-direction/decisions/001-sequenced-roadmap.md`.
