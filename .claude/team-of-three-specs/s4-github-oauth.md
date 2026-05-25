---
subsystem_id: s4-github-oauth
files:
  - backend/apps/accounts/github_oauth.py
  - backend/apps/accounts/github_views.py
  - backend/apps/accounts/urls.py
  - backend/apps/accounts/tests/test_github_oauth.py
estimate_loc: 180
mechanism: |
  Add GitHub OAuth primary login mirroring discord_oauth.py pattern: start/callback,
  UserSocialAccount platform=github, JWT on success.
acceptance_criteria:
  - "GITHUB_CLIENT_ID/SECRET env vars documented"
  - "Start and callback routes registered under /api/v1/auth/github/"
  - "Tests mock GitHub token exchange"
commit_scope: accounts
parent_spec: .claude/team-of-three-specs/s3-social-primary-auth.md
---

# S4 — GitHub OAuth (new)

Mirror Discord OAuth implementation.
