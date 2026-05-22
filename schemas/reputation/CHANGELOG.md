# Reputation schema changelog

## v1.2.0 — 2026-05-22

- Phase 5 complete: portable export contract test; appeals/console APIs documented in `PHASE_5_VERIFICATION.md`.

## v1.1.0 — 2026-05-22

- `portable-export.schema.json` for `GET /api/v1/profiles/<wallet>/reputation/export/`.
- History item shape documented in export schema `$defs/historyItem`.

## v1.0.0 — 2026-05-22

- Initial `profile-reputation.schema.json` frozen for Phase 5 Wave 0.
- Mirrors `GET /api/v1/integrity/<wallet_address>/` response (camelCase).
