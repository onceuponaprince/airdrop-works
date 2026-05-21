# Phase 4 Parallel Execution — Open Rubric / Data Coop

> **For agentic workers:** Execute wave-by-wave; atomic commits per lane; PR → merge → version bump.

**Goal:** Publish rubric spec (JSON Schema + versioning), public rubric catalog API, local evaluation harness, governance + data coop docs, developer surface.

**Prereq:** Phase 3 complete (`0.4.0`), `docs/PHASE_3_COMPLETE.md`.

**Target release:** `0.5.0` at Wave 3 close.

**North star:** [`research/airdrop-direction/decisions/001-sequenced-roadmap.md`](../../research/airdrop-direction/decisions/001-sequenced-roadmap.md) § Phase 4.

---

## Wave 0 — Contract freeze

| Item | Deliverable |
|------|-------------|
| API contract | `docs/PHASE_4_VERIFICATION.md` |
| Prep | `docs/PHASE_4_PREP.md` |
| Smoke | `scripts/verify_phase4_endpoints.sh` |

**Gate:** Phase 3 gate still green (`./scripts/verify_phase3_gate.sh`).

---

## Wave 1 — Spec + catalog API (parallel)

### rubricSpec
- [x] `schemas/rubric/v1/rubric-spec.schema.json` + `CHANGELOG.md`
- [x] Canonical JSON: `contribution_quality_v1`, `performance_marketing_v1`
- [x] `rubric_spec.py` export helper + tests

**Commit:** `feat(judge): open rubric JSON schema v1`

### rubricCatalogApi
- [ ] `GET /api/v1/judge/rubrics/` — keyed catalog
- [ ] `GET /api/v1/judge/rubrics/<key>/` — OpenRubric payload
- [ ] `GET /api/v1/judge/rubrics/schema/` — spec metadata

**Commit:** `feat(judge): public rubric catalog API`

### rubricSeed
- [ ] Migration seed `contribution_quality_v1` on default rubric

**Commit:** `feat(judge): seed contribution_quality_v1 rubric key`

---

## Wave 2 — OSS harness + docs surface (parallel)

### ossHarness
- [ ] `tools/rubric-eval/` local heuristic evaluator (no API key)
- [ ] `scripts/score_rubric_local.sh`

**Commit:** `feat(tools): rubric-eval local harness`

### developerUi
- [ ] `/developers/rubrics` page — catalog + curl examples + schema link

**Commit:** `feat(frontend): developers rubric catalog page`

### governanceDocs
- [ ] `docs/RUBRIC_GOVERNANCE.md`, `docs/DATA_COOP_RULES.md`
- [ ] Hosted API tier note in `PHASE_4_PREP.md`

**Commit:** `docs: rubric governance and data coop rules`

---

## Wave 3 — Verification & release

- [ ] `scripts/verify_phase4_gate.sh`
- [ ] Sign off `PHASE_4_VERIFICATION.md`
- [ ] `docs/PHASE_4_COMPLETE.md`
- [ ] Bump **0.5.0**

---

## Wave map

```
Wave 0 (serial)   → contract + prep
Wave 1 (parallel) → rubricSpec | rubricCatalogApi | rubricSeed
Wave 2 (parallel) → ossHarness | developerUi | governanceDocs
Wave 3 (serial)   → verify + 0.5.0
```

## Out of scope (Phase 4)

- Foundation legal entity / token governance
- Full data coop ingestion pipeline
- Private model SLA tier (document only)
- npm/PyPI package publish (repo-local harness first)
