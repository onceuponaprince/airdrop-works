# Phase 3 prep — Marketing Judge

**Baseline:** `0.3.2` (Phase 2 complete)  
**Plan:** [`superpowers/plans/2026-05-21-phase-3-parallel-execution.md`](superpowers/plans/2026-05-21-phase-3-parallel-execution.md)

## Prereqs

```bash
./scripts/verify_phase2_gate.sh
cp .env.example .env   # ANTHROPIC_API_KEY for live scoring
docker compose up -d db redis backend frontend
```

## Lanes

| Lane | Paths |
|------|--------|
| rubricPack | `backend/apps/judge/models.py`, `marketing.py`, migrations |
| marketingApi | `backend/apps/judge/views.py`, `urls.py`, tests |
| growthUi | `frontend/src/app/(marketing)/growth/`, `MarketingJudgeDemo.tsx` |
| analyticsPlg | `frontend/src/lib/analytics.ts` |

## Marketing dimensions (`performance_marketing_v1`)

| ID | Weight | Description |
|----|--------|-------------|
| hook | 0.25 | Opening stops the scroll |
| clarity | 0.25 | Message is understandable fast |
| audienceFit | 0.20 | Right audience + tone |
| ctaStrength | 0.20 | Clear next step |
| fatigueRisk | 0.10 | Lower is better (inverted in composite) |

## Success criteria

1. `POST /api/v1/judge/demo/marketing/` returns five dimension scores + composite.
2. `/growth` demo scores pasted ad copy with streaming or fast JSON response.
3. GA events fire on score complete.
4. Release **0.4.0** with verification signed off.

## Credits scope (deferred)

Authenticated marketing scores can reuse the Stripe credit ledger (`apps/payments`) when billing is enabled:

- **Demo path (Phase 3):** `POST /api/v1/judge/demo/marketing/` — public, throttled, no credits.
- **App path (later):** `POST /api/v1/judge/score/` with `rubric_key=performance_marketing_v1` — deduct credits per campaign settings.
- **Flag:** gate live billing behind `MARKETING_JUDGE_CREDITS_ENABLED` (not shipped in 0.4.0).
