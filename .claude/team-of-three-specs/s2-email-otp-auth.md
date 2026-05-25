---
subsystem_id: s2-email-otp-auth
files:
  - backend/apps/accounts/views.py
  - backend/apps/accounts/serializers.py
  - backend/apps/accounts/urls.py
  - backend/apps/accounts/tests/test_email_otp_auth.py
  - frontend/src/hooks/useEmailAuth.ts
  - frontend/src/lib/api.ts
estimate_loc: 200
mechanism: |
  Add POST /api/v1/auth/email/verify/ that accepts Supabase-verified email OTP token,
  creates or loads a wallet-less User, and returns Django JWT (access + refresh cookie).
acceptance_criteria:
  - "New endpoint verifies Supabase session/token server-side"
  - "Creates user with generated username when email is new"
  - "Returns same JWT shape as wallet-verify"
  - "Rate-limited; invalid token returns 401"
commit_scope: accounts
parent_spec: .claude/team-of-three-specs/s1-wallet-optional-user.md
---

# S2 — Email OTP primary auth (Supabase → Django JWT)

Depends on S1 (wallet-optional User). See conversation plan for merge rules (S6).
