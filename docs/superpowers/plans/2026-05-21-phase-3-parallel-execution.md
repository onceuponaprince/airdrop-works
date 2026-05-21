# Phase 3 Parallel Execution — Marketing Judge

> **For agentic workers:** Execute wave-by-wave; atomic commits per lane; PR → merge → version bump.

**Goal:** Second vertical on shared `AICoreScoringService` — `performance_marketing_v1` rubric, PLG demo on `/growth`, analytics. No ad-platform OAuth.

**Prereq:** Phase 2 complete (`0.3.2`), `docs/PHASE_2_COMPLETE.md`.

**Target release:** `0.4.0` at Wave 3 close.

**North star:** [`research/airdrop-direction/decisions/001-sequenced-roadmap.md`](../../research/airdrop-direction/decisions/001-sequenced-roadmap.md) § Phase 3.

---

## Wave 0 — Contract freeze

| Item | Deliverable |
|------|-------------|
| API contract | `docs/PHASE_3_VERIFICATION.md` |
| Prep | `docs/PHASE_3_PREP.md` |
| Smoke | `scripts/verify_phase3_endpoints.sh` |

**Gate:** Phase 2 gate still green (`./scripts/verify_phase2_gate.sh`).

---

## Wave 1 — Rubric + backend demo (parallel)

### rubricPack
- [x] `ScoringRubric.key` slug + `dimension_config` JSON
- [x] Seed `performance_marketing_v1` (hook, clarity, audienceFit, ctaStrength, fatigueRisk)
- [x] `apps/judge/marketing.py` scorer + tests

**Commit:** `feat(judge): performance_marketing_v1 rubric pack`

### marketingApi
- [x] `POST /api/v1/judge/demo/marketing/` public throttled endpoint
- [x] CamelCase response: `dimensions`, `compositeScore`, `fatigueRisk`, `rubricKey`

**Commit:** `feat(judge): marketing copy demo API`

---

## Wave 2 — Growth PLG surface (parallel)

### growthUi
- [x] `/growth` route + `MarketingJudgeDemo` (ad-copy presets, paste-to-score)
- [x] Client → Django `POST /api/v1/judge/demo/marketing/`
- [ ] Shareable score query params (optional `/score` variant later)

**Commit:** `feat(frontend): growth marketing judge demo page`

### analyticsPlg
- [x] `events.marketingDemoScore`, `marketingDemoComplete`
- [x] CTA to waitlist from growth page

**Commit:** `feat(analytics): marketing judge PLG events`

### creditsGate (optional / flag)
- [x] Document Stripe credit path for authenticated marketing score (defer live billing to Wave 3 if needed)

**Commit:** `docs: marketing judge credits scope note`

---

## Wave 3 — Verification & release

- [x] `scripts/verify_phase3_gate.sh`
- [x] Sign off `PHASE_3_VERIFICATION.md`
- [x] `docs/PHASE_3_COMPLETE.md`
- [x] Bump **0.4.0**

---

## Wave map

```
Wave 0 (serial)   → contract + prep
Wave 1 (parallel) → rubricPack | marketingApi
Wave 2 (parallel) → growthUi | analyticsPlg | creditsGate
Wave 3 (serial)   → verify + 0.4.0
```

## Out of scope (Phase 3)

- Subdomain DNS / separate brand domain (use `/growth` path first)
- Meta/Google Ads OAuth
- Full OSS rubric publish (Phase 4)
