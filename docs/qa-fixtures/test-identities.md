# Test Identities

Prepared on: 2026-05-25

## 1) Admin account

- Username: `qa-superadmin`
- Wallet: `0x0000000000000000000000000000000000000000`
- Access: full admin
- Source: `seed_qa_accounts`

## 2) Normal eligible user

- Username: `genuine-user` (allocation test persona)
- Wallet: `0x2222222222222222222222222222222222222222`
- Expected behavior: should classify as eligible (non-`exclude`) when contribution history is genuine with solid scores.
- Source pattern: `backend/apps/integrity/tests/test_allocation.py`

## 3) Ineligible user

- Username: `qa-non-admin`
- Wallet: `0x0000000000000000000000000000000000000010`
- Expected behavior: in strict allocation, typically `exclude` when no scored contributions exist.
- Source: `seed_qa_accounts`

## 4) Wallet/account with bad input history (negative tests)

- Username: `farmer-user` (allocation test persona)
- Wallet: `0x3333333333333333333333333333333333333333`
- Expected behavior: high farming pattern should classify as `exclude` under `airdrop_strict`.
- Source pattern: `backend/apps/integrity/tests/test_allocation.py`

## 5) Email OTP user (wallet-optional)

- Email: `qa+email-otp@<your-domain>` (use a fresh address per run)
- Wallet: none
- Expected behavior: Supabase OTP → Django JWT via `/auth/email/verify/`; lands on `/dashboard` (S5) or `/onboarding` (S7 when social-only routing is merged).
- Source: manual signup via `/login` email panel

## 6) Social-only user (OAuth, no wallet)

- Email: provider-assigned (GitHub/X/Discord/Telegram)
- Wallet: none at creation
- Expected behavior: OAuth login → JWT without `wallet_address`; S7 routes to `/onboarding` before `/dashboard`.
- Source: `/login` social buttons; configure provider env vars locally

## 7) Identity merge pair (S6)

Use two personas to test Resend confirm merge:

| Persona | Auth method | Identifier |
| --- | --- | --- |
| **Merge target (existing)** | Wallet SIWE | `0x0000000000000000000000000000000000000002` (`qa-admin-two`) |
| **Merge candidate (new login)** | Email OTP or social | Same email as target once linked, or email that matches existing row |

Expected: login with candidate triggers confirmation email (not instant merge); confirm link completes merge; `GET /auth/social/me/` shows combined identities.

## Notes

- `qa-superadmin` and `qa-non-admin` are deterministic via `python manage.py seed_qa_accounts`.
- `genuine-user` and `farmer-user` are canonical test personas from allocation tests. If they do not exist in your target environment, create equivalent users with the same wallet addresses and contribution profiles.
- Email OTP and social personas are ephemeral — create per QA session; do not commit real inbox addresses.

