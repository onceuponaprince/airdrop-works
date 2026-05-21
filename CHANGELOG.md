# Changelog

All notable changes to this repository will be documented in this file.

## Unreleased

### Added
- Server-side waitlist email verification and improved submission flow. (50878ad, 2026-04-06)
- CI workflow and admin campaign tests; infrastructure for running tests in CI. (19fcaad, 2026-05-10)
- Playwright E2E mocks and tests for wallet flows (MetaMask success/reject/wrong-network). (PR #2, 2026-05-20)

### Changed
- Phase 2 artifacts: runbooks, payout skeleton, and sprint updates. (c9784c4, 2026-05-18)
- Judge scaling and payout helper merged. (a311bf5, 2026-05-18)
- Refactors and deployment fixes. (302e2ac, 2026-03-31)
- API routing refinements, improved type-safety and UX tweaks. (54e6739, 2026-03-31)

### Fixed
- Resolve package manager lockfile conflicts and related cleanup. (077f528 / fe6dd11, 2026-03-31)

### Chore
- Various CI and test additions and housekeeping. (70b54fe, 2026-05-18)

## 0.2.1 - 2026-05-21

### Added
- Added reward-system campaign payout and connector API hardening for release readiness.

### Changed
- Bumped monorepo package versions (root, frontend, contracts, and backend metadata) from `0.2.0` to `0.2.1` to keep release artifacts aligned.

### Chore
- Updated changelog for this release boundary and upcoming merge ship handoff.

---

This changelog was generated automatically from recent merge commits on `main`.
