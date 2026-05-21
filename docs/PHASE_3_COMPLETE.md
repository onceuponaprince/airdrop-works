# Phase 3 complete

**Release line:** `0.3.2` (Phase 2) → **`0.4.0`** (Marketing Judge)

## What shipped

| Wave | Deliverables |
|------|----------------|
| 0 | `PHASE_3_PREP.md`, `PHASE_3_VERIFICATION.md`, `verify_phase3_endpoints.sh`, `verify_phase3_gate.sh` |
| 1 | `performance_marketing_v1` rubric, `marketing.py` scorer, `POST /api/v1/judge/demo/marketing/` |
| 2 | `/growth` PLG demo, `MarketingJudgeDemo`, analytics events |
| 3 | Gate sign-off, completion guide |

## Verify locally

```bash
docker compose up -d db redis backend frontend
./scripts/verify_phase3_gate.sh
```

## PR

- [#16](https://github.com/onceuponaprince/airdrop-works/pull/16) — Phase 3 Marketing Judge

## Beyond Phase 3

Roadmap Phase 4: OSS rubric publish, subdomain brand, ad OAuth — see `research/airdrop-direction/decisions/001-sequenced-roadmap.md`.
