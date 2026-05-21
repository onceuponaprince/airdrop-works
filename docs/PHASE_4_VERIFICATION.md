# Phase 4 Verification Checklist

**Plan:** [`superpowers/plans/2026-05-21-phase-4-parallel-execution.md`](superpowers/plans/2026-05-21-phase-4-parallel-execution.md)

## API contract

| Resource | Path | Auth |
|----------|------|------|
| Rubric catalog | `GET /api/v1/judge/rubrics/` | Public |
| Rubric by key | `GET /api/v1/judge/rubrics/<key>/` | Public |
| Spec metadata | `GET /api/v1/judge/rubrics/schema/` | Public |
| Legacy list | `GET /api/v1/judge/rubric/` | Public (unchanged) |

### OpenRubric response (minimum)

```json
{
  "key": "performance_marketing_v1",
  "specVersion": "1.0.0",
  "name": "Performance Marketing v1",
  "license": "CC-BY-4.0",
  "dimensions": [
    { "id": "hook", "weight": 0.25, "label": "Hook" }
  ],
  "revision": "2026-05-21T12:00:00Z"
}
```

## Smoke

```bash
./scripts/verify_phase4_endpoints.sh
./scripts/verify_phase3_gate.sh
```

## Manual

- [x] Open `/developers/rubrics` — catalog renders with curl examples
- [x] `tools/rubric-eval/evaluate.py` scores sample against `performance_marketing_v1`
- [x] `schemas/rubric/CHANGELOG.md` documents v1.0.0 rubrics

## Sign-off

**2026-05-21** — Waves 0–3 complete; release **0.5.0**

- [x] `./scripts/verify_phase4_gate.sh` green
- [x] `test_rubric_catalog.py` + `test_rubric_spec.py` (6 tests)
