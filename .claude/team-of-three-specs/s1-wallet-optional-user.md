---
subsystem_id: s1-wallet-optional-user
files:
  - backend/apps/accounts/models.py
  - backend/apps/accounts/admin.py
  - backend/apps/accounts/social_models.py
  - backend/apps/accounts/social_sync_service.py
  - backend/apps/accounts/tests/test_wallet_optional_user.py
estimate_loc: 120
mechanism: |
  Make User identity work without a wallet: switch USERNAME_FIELD from wallet_address
  to username (auto-generated for email/social-only users), harden all wallet_address[:N]
  slice callsites against None, and add tests proving wallet-less user creation works.
acceptance_criteria:
  - "USERNAME_FIELD is username; wallet_address remains unique nullable"
  - "User.objects.create_user(username=..., email=...) succeeds with no wallet"
  - "social_models.__str__ and social_sync_service logs handle null wallet_address"
  - "Admin create/edit forms work when wallet_address is blank"
  - "Existing wallet-auth users and SIWE flow unchanged"
commit_scope: accounts
parent_spec: docs/qa-and-user-flow.md
---

# S1 — Wallet-optional User model

## Why

Full login (email OTP + social OAuth) requires users who may never connect a wallet.
Today `USERNAME_FIELD = "wallet_address"` blocks Django auth for wallet-less users, and
several callsites slice `wallet_address[:6]` without null guards.

## What

### models.py

- Change `USERNAME_FIELD` to `"username"`.
- Keep `wallet_address` unique, nullable, indexed (already is).
- Ensure `REQUIRED_FIELDS` is sensible (email optional for wallet users).
- Add a helper or document pattern: `user_{uuid_hex[:12]}` usernames for social/email-only signups.

### Null-safe callsites (audit + fix)

- `backend/apps/accounts/social_models.py` line ~41: use `short_address` or guard.
- `backend/apps/accounts/social_sync_service.py` lines ~40, ~64: guard before `[:6]`.

Do **not** change unrelated apps in this subsystem (leaderboard/referrals are follow-ups).

### admin.py

- Allow blank `wallet_address` in add/change forms without validation errors.

### Tests — `test_wallet_optional_user.py`

- `test_create_user_without_wallet` — email-only user, JWT-eligible.
- `test_short_address_empty_when_no_wallet`.
- `test_social_account_str_without_wallet` — no AttributeError on `__str__`.

## Out of scope

- Email OTP login endpoint (S2).
- OAuth primary-auth mode (S3/S4).
- Frontend `/login` UI (S5).

## Smoke test

```bash
cd backend
uv run pytest apps/accounts/tests/test_wallet_optional_user.py -q
uv run pytest apps/accounts/ -q  # full accounts suite still green
```
