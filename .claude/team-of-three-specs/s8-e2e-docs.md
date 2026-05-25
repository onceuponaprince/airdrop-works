---
subsystem_id: s8-e2e-docs
files:
  - frontend/src/__tests__/auth-flow.test.tsx
  - docs/qa-and-user-flow.md
  - docs/QA_GUIDE.md
estimate_loc: 100
mechanism: |
  Extend auth-flow vitest coverage for email + social login paths; update QA docs
  with new login matrix and test identities.
acceptance_criteria:
  - "Vitest auth-flow covers email OTP mock path"
  - "QA docs list all five providers + merge flow"
  - "QA docs document landing ↔ app paths (nav, waitlist success, /login, /signup)"
commit_scope: frontend
parent_spec: .claude/team-of-three-specs/s7-onboarding.md
---

# S8 — E2E tests + docs

Final subsystem after S1–S7 land.
