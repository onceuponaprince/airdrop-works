# Rubric governance

**Spec:** `schemas/rubric/v1/rubric-spec.schema.json`  
**Changelog:** `schemas/rubric/CHANGELOG.md`

## Versioning

- **Spec version** (`specVersion`): SemVer for the JSON Schema and required fields. Breaking schema changes increment major.
- **Rubric key** (`<name>_v<N>`): Immutable identifier. Breaking dimension changes publish a new key (e.g. `contribution_quality_v2`), never mutate v1 in place.
- **Revision** (`revision`): ISO timestamp from DB `updated_at` for hosted copies; informational only.

## Change process

1. Propose change in GitHub issue or internal doc with migration impact.
2. Update canonical JSON under `schemas/rubric/v1/rubrics/`.
3. Ship DB seed/migration if hosted rubric changes.
4. Append `schemas/rubric/CHANGELOG.md`.
5. Run `./scripts/verify_phase4_gate.sh`.

## Forks and attribution

Forks must retain `license` and `key` fields. Renaming a forked rubric requires a new `key`; do not impersonate `contribution_quality_v1` or `performance_marketing_v1` with different dimensions.

## Hosted authority

The API catalog at `GET /api/v1/judge/rubrics/` is the runtime source of truth for production scoring. Repo JSON files are the public reference for integrators and offline harnesses.
