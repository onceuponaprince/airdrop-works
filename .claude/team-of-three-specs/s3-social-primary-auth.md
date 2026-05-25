---
subsystem_id: s3-social-primary-auth
files:
  - backend/apps/accounts/twitter_views.py
  - backend/apps/accounts/discord_views.py
  - backend/apps/accounts/telegram_views.py
  - backend/apps/accounts/tests/test_social_primary_auth.py
estimate_loc: 250
mechanism: |
  Repurpose Twitter/Discord/Telegram OAuth flows for primary login (not wallet-link-only):
  unauthenticated start → callback creates session JWT for new or existing social user.
acceptance_criteria:
  - "OAuth start works without Authorization header"
  - "Callback issues JWT for new social-only user"
  - "Existing linked account still works for wallet users"
commit_scope: accounts
parent_spec: .claude/team-of-three-specs/s2-email-otp-auth.md
---

# S3 — Social OAuth primary auth mode

Depends on S1. GitHub is S4.
