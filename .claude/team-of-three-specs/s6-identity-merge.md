---
subsystem_id: s6-identity-merge
files:
  - backend/apps/accounts/merge_service.py
  - backend/apps/accounts/views.py
  - backend/apps/accounts/tests/test_identity_merge.py
  - frontend/src/app/api/auth/merge/confirm/route.ts
estimate_loc: 220
mechanism: |
  When login email matches an existing account, send Resend confirmation link before
  linking identities; merge endpoint activates link after token verify.
acceptance_criteria:
  - "Email match triggers confirmation email, not auto-merge"
  - "Confirm token single-use with expiry"
  - "Merged user retains wallet + social links"
commit_scope: accounts
parent_spec: .claude/team-of-three-specs/s5-login-ui.md
---

# S6 — Email-confirm identity merge

User chose Resend confirmation before linking accounts.
