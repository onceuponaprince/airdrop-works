# Phase 3 Verification Checklist

**Plan:** [`superpowers/plans/2026-05-21-phase-3-parallel-execution.md`](superpowers/plans/2026-05-21-phase-3-parallel-execution.md)

## API contract

| Resource | Path | Auth |
|----------|------|------|
| Marketing demo | `POST /api/v1/judge/demo/marketing/` | Public (throttled) |
| Rubric by key | `GET /api/v1/judge/rubric/?key=performance_marketing_v1` | Public list filter TBD |

### Response (minimum)

```json
{
  "rubricKey": "performance_marketing_v1",
  "compositeScore": 78,
  "fatigueRisk": "low",
  "dimensions": {
    "hook": 82,
    "clarity": 75,
    "audienceFit": 80,
    "ctaStrength": 70,
    "fatigueRisk": 25
  },
  "dimensionExplanations": {
    "hook": "…",
    "clarity": "…"
  },
  "scoredAt": "2026-05-21T…"
}
```

## Smoke

```bash
./scripts/verify_phase3_endpoints.sh
./scripts/verify_phase2_gate.sh
```

## Manual

- [x] Open `/growth` → paste sample ad → score renders (API + component shipped)
- [x] Waitlist CTA visible after score (`MarketingJudgeDemo`)
- [x] Homepage `/` still shows Web3 contribution demo (separate route)

## Sign-off

**2026-05-21** — Waves 0–3 complete; release **0.4.0**

- [x] `./scripts/verify_phase3_gate.sh` green
- [x] `apps/judge/tests/test_marketing.py` (3 tests)
