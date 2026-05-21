# Phase 4 prep — Open Rubric / Data Coop

**Baseline:** `0.4.0` (Phase 3 complete)  
**Plan:** [`superpowers/plans/2026-05-21-phase-4-parallel-execution.md`](superpowers/plans/2026-05-21-phase-4-parallel-execution.md)

## Prereqs

```bash
./scripts/verify_phase3_gate.sh
docker compose up -d db redis backend frontend
```

## Lanes

| Lane | Paths |
|------|--------|
| rubricSpec | `schemas/rubric/v1/`, `backend/apps/judge/rubric_spec.py` |
| rubricCatalogApi | `backend/apps/judge/views.py`, `urls.py`, serializers |
| ossHarness | `tools/rubric-eval/` |
| developerUi | `frontend/src/app/(marketing)/developers/rubrics/` |
| governanceDocs | `docs/RUBRIC_GOVERNANCE.md`, `docs/DATA_COOP_RULES.md` |

## Hosted API tier (documented, not new infra)

| Tier | Access | Notes |
|------|--------|-------|
| Public demo | `POST /api/v1/judge/demo/*` | Existing throttles |
| Catalog | `GET /api/v1/judge/rubrics/` | No auth |
| Authenticated score | `POST /api/v1/judge/score/` | Credits (Stripe path from Phase 3) |
| Enterprise | Custom SLA / private model | Sales-led; flag `ENTERPRISE_JUDGE_ENABLED` |

## Success criteria

1. External team can fetch rubric JSON + schema without Django admin.
2. `tools/rubric-eval` scores sample text offline.
3. `/developers/rubrics` documents integration path.
4. Release **0.5.0** with verification signed off.
