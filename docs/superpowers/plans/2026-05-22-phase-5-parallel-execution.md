# Phase 5 parallel execution — Portable reputation network

**Baseline:** `0.5.2`  
**Release target:** `0.6.0` (Wave 3)  
**ADR:** [`research/airdrop-direction/decisions/001-sequenced-roadmap.md`](../../research/airdrop-direction/decisions/001-sequenced-roadmap.md) § Phase 5

## Waves

| Wave | Focus | Exit |
|------|--------|------|
| **0** | Contract freeze — `profile-reputation.schema.json`, verify scripts | Gate green, schema tests |
| **1** | Cross-campaign history API + portable score export | History endpoints + tests |
| **2** | Appeals workflow v0 + protocol console read API | Appeals model + staff UI |
| **3** | E2E, docs, **0.6.0** | Full gate + changelog |

## Wave 0 tasks

- [x] `schemas/reputation/v1/profile-reputation.schema.json`
- [x] `docs/PHASE_5_VERIFICATION.md`
- [x] `scripts/verify_phase5_endpoints.sh`, `verify_phase5_gate.sh`
- [x] `apps/integrity/tests/test_reputation_schema.py`

## Wave 1 tasks

- [x] `GET /api/v1/profiles/<wallet>/reputation/history/` (paginated)
- [x] `GET /api/v1/profiles/<wallet>/reputation/export/` (`PortableReputationExport`)
- [x] `schemas/reputation/v1/portable-export.schema.json`
- [x] `test_reputation_history.py`, `test_reputation_export.py`

## Wave 2+ (not started)

- Appeals queue + resolution states
- Protocol console read routes under `/api/v1/integrity/`

## Prereq

```bash
./scripts/verify_phase4_gate.sh
```
