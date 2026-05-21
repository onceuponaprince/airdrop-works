# Changelog

All notable changes to this repository will be documented in this file.

## Unreleased

### Added

### Changed

### Fixed

### Chore

## 0.2.3 - 2026-05-21

### Added
- Figma variable collection spec (`docs/figma-variables.md`) for landing refresh and marketing↔app parity.
- Cursor Figma MCP design system rules (`.cursor/rules/figma-design-system.mdc`).

### Changed
- `CLAUDE.md` links designers and implementers to the Figma handoff docs.

### Chore
- Bumped monorepo package versions to `0.2.3`.

## 0.2.2 - 2026-05-21

### Added
- Deterministic Playwright journey suite (mock-first, no backend dependency).

### Changed
- Landing page funnel: simplified hero CTA and moved trust + waitlist earlier.

### Fixed
- Rate-limited waitlist email check endpoint to reduce enumeration abuse.

### Chore
- CI now runs Playwright journeys.

## 0.2.1 - 2026-05-21

### Added
- Added reward-system campaign payout and connector API hardening for release readiness.

### Changed
- Bumped monorepo package versions (root, frontend, contracts, and backend metadata) from `0.2.0` to `0.2.1` to keep release artifacts aligned.

### Chore
- Updated changelog for this release boundary and upcoming merge ship handoff.

---

This changelog was generated automatically from recent merge commits on `main`.
