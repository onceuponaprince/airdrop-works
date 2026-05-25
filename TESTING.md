# Testing: airdrop-works

Project-level testing guidance overrides the global /home/onceuponaprince/TESTING.md defaults.

## Defaults

- Do not run tests unless explicitly requested.
- Prefer targeted tests for the changed subsystem.
- Use existing fixtures, mocks, and test utilities.
- Do not add broad end-to-end coverage when a focused unit or integration test proves the behavior.

## Commands

Document exact commands here once confirmed from the project:

- Unit tests: TBD.
- Integration tests: TBD.
- Type checks: TBD.
- Lint checks: TBD.
- Format checks: TBD.
- End-to-end tests: TBD.

## Security-Sensitive Gates

If this project exposes execution, browser automation, provider routing, auth, payments, webhooks, or secret handling, tests should cover auth rejection, policy rejection, redaction, timeout cleanup, and audit/provenance records.
