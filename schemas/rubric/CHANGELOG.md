# Rubric spec changelog

## 1.0.0 — 2026-05-21

- Initial Open Rubric JSON Schema (`schemas/rubric/v1/rubric-spec.schema.json`).
- Canonical rubrics:
  - `contribution_quality_v1` — Web3 contribution dimensions + `farming_flag` signal.
  - `performance_marketing_v1` — hook, clarity, audience fit, CTA, fatigue risk.

**Breaking changes:** None (first release).

**Migration:** Rubrics with `key` are served at `GET /api/v1/judge/rubrics/<key>/`.
