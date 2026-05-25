# QA Guide

For human-facing tester onboarding and walkthroughs, see `docs/AIRDROP_WORKS_QA_ONBOARDING.md`.

This guide is for local QA only. The fake wallet login path depends on `config.settings.local`, where `DEBUG=True` and SIWE verification is skipped unless `ENFORCE_SIWE=True`. Do not enable these fake wallets in production.

## Seed QA Accounts

Start the local database services:

```bash
docker compose up -d db redis
```

Apply migrations and seed deterministic QA accounts:

```bash
cd backend
UV_PROJECT_ENVIRONMENT=/tmp/airdrop-works-backend-venv \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5434/airdrop_works \
REDIS_URL=redis://127.0.0.1:6378/0 \
DJANGO_SETTINGS_MODULE=config.settings.local \
uv run --extra dev python manage.py migrate --noinput

UV_PROJECT_ENVIRONMENT=/tmp/airdrop-works-backend-venv \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5434/airdrop_works \
REDIS_URL=redis://127.0.0.1:6378/0 \
DJANGO_SETTINGS_MODULE=config.settings.local \
uv run --extra dev python manage.py seed_qa_accounts
```

Default password for every seeded QA account:

```text
AirdropQA!2026
```

## Fake Wallet Accounts

| Username | Wallet | Role | Plan | Credits |
| --- | --- | --- | --- | --- |
| `qa-superadmin` | `0x0000000000000000000000000000000000000000` | Superadmin | team | 500 |
| `qa-admin-one` | `0x0000000000000000000000000000000000000001` | Superadmin | team | 500 |
| `qa-admin-two` | `0x0000000000000000000000000000000000000002` | Superadmin | pro | 250 |
| `qa-non-admin` | `0x0000000000000000000000000000000000000010` | Non-admin control | free | 25 |

## Endpoint Login Without Real Wallet Data

Use any seeded fake wallet with dummy `message` and `signature` values in local/dev mode:

```bash
curl -sS -X POST http://localhost:8001/api/v1/auth/wallet-verify/ \
  -H 'Content-Type: application/json' \
  -d '{
    "wallet_address": "0x0000000000000000000000000000000000000001",
    "message": "dev-bypass",
    "signature": "dev-bypass"
  }'
```

Expected result:

- HTTP `200`
- Response includes `access` and `refresh` JWTs
- `user.isStaff` is `true` for the three admin wallets
- `user.isStaff` is `false` for `qa-non-admin`


## Deployed QA Fake Wallet Login

The deployed API does not skip SIWE by default. To use fake wallets on a deployed QA or staging environment, enable the explicit QA bypass in the backend environment and restart the backend:

```bash
QA_WALLET_LOGIN_ENABLED=true
QA_WALLET_LOGIN_SECRET='use-a-long-random-secret'
QA_WALLET_LOGIN_WALLETS='0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000001,0x0000000000000000000000000000000000000002,0x0000000000000000000000000000000000000010'
```

Seed the same accounts in the deployed database:

```bash
QA_ACCOUNT_PASSWORD='AirdropQA!2026' python manage.py seed_qa_accounts
```

Then request a JWT from the deployed API with the secret header:

```bash
curl -sS -X POST https://YOUR_API_HOST/api/v1/auth/wallet-verify/ \
  -H 'Content-Type: application/json' \
  -H 'X-QA-Auth-Secret: use-a-long-random-secret' \
  -d '{
    "wallet_address": "0x0000000000000000000000000000000000000001",
    "message": "dev-bypass",
    "signature": "dev-bypass"
  }'
```

Expected result: HTTP `200`, `access` and `refresh` tokens, and `user.isStaff=true` for admin wallets. Without the `X-QA-Auth-Secret` header, the same fake signature should return `401`.

To test the deployed frontend with the returned token, open browser devtools on the deployed frontend and run:

```js
localStorage.setItem('auth_token', '<ACCESS_TOKEN_FROM_RESPONSE>')
localStorage.setItem('refresh_token', '<REFRESH_TOKEN_FROM_RESPONSE>')
location.href = '/dashboard'
```

After QA, disable the bypass and restart the backend:

```bash
QA_WALLET_LOGIN_ENABLED=false
QA_WALLET_LOGIN_SECRET=
```

## Browser QA Login

1. Start backend and frontend. If using Docker, run `docker compose up backend frontend celery`. If running locally, run backend on `localhost:8001` and frontend on `localhost:3000`.
2. Open `http://localhost:3000/login`.
3. If Particle wallet is not configured, click `Dev Login (no wallet)`. This uses `0x0000000000000000000000000000000000000000`, which is seeded as `qa-superadmin`.
4. Confirm you land on `/dashboard`.
5. Open `/admin` in the app. Expected: admin overview cards load instead of redirecting to dashboard.

## Django Admin Login

Open Django admin:

```text
http://localhost:8001/admin/
```

Use:

```text
username: qa-superadmin
password: AirdropQA!2026
```

Expected result: Django admin loads and account, contribution, payment, quest, and scoring models are visible according to registered admin classes.

## Auth Provider Matrix (`/login`)

All six sign-in paths are available on `/login`. Wallet SIWE remains the primary Web3 path; email and social providers are wallet-optional (S1–S5).

| Provider | UI control | Backend flow | Post-auth default (S5) | Post-auth with S7 |
| --- | --- | --- | --- | --- |
| **Wallet (SIWE)** | Connect wallet → sign message | `POST /api/v1/auth/wallet-verify/` | `/dashboard` | `/dashboard` |
| **Email OTP** | Email → 6-digit code | Supabase `signInWithOtp` + `verifyOtp` → `POST /api/v1/auth/email/verify/` | `/dashboard` | `/onboarding` if no wallet on profile |
| **X (Twitter)** | Continue with X | `GET /auth/twitter/start/?mode=login` → OAuth → callback `?twitter=login&access=…` | `/dashboard` | `/onboarding` if social-only |
| **Discord** | Continue with Discord | Same pattern via `/auth/discord/start/` | `/dashboard` | `/onboarding` if social-only |
| **GitHub** | Continue with GitHub | Same pattern via `/auth/github/start/` | `/dashboard` | `/onboarding` if social-only |
| **Telegram** | Continue with Telegram | Deep link + poll `GET /auth/telegram/login/poll/?poll_key=…` | `/dashboard` | `/onboarding` if social-only |

### Email OTP local QA

1. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `frontend/.env.local`.
2. Start backend + frontend; open `http://localhost:3000/login`.
3. Enter a fresh email (e.g. `qa+email-otp@<your-domain>`), click **Send verification code**.
4. Check inbox; enter the 6-digit code and click **Verify and continue**.
5. Expected: JWT stored in `localStorage.auth_token`; redirect to `/dashboard` (or `/onboarding` once S7 lands for wallet-less profiles).

### Social login local QA

1. Configure provider env vars on backend (see `.env.example` for `TWITTER_*`, `DISCORD_*`, `GITHUB_*`, `TELEGRAM_*`).
2. Open `/login`; click a social provider button.
3. Complete OAuth (or Telegram deep link + **Start**).
4. Expected: return to `/login?{provider}=login&access=…&refresh=…`; session applied; URL cleaned; redirect to app.
5. Telegram: keep the login tab open while completing the bot flow — polling detects completion within ~2s.

### Identity merge flow (S6 — Resend confirm)

When email OTP or social login matches an **existing** account (same email, different auth method), the backend must **not** auto-merge.

| Step | Actor | Expected |
| --- | --- | --- |
| 1 | User signs in with email/social that matches an existing account | HTTP `202` or UI message: confirmation email sent (Resend) |
| 2 | User clicks link in email | `GET /api/auth/merge/confirm?token=…` (Next.js route → Django merge endpoint) |
| 3 | Token valid, single-use, unexpired | Accounts linked; user retains wallet + social links; JWT issued or session refreshed |
| 4 | Token reused or expired | Error page / toast; no duplicate merge; user must restart login |

QA negative cases:

- Request merge confirm with expired token → expect failure, no DB link.
- Request merge confirm twice with same token → second attempt fails (single-use).
- Merge wallet account A with social account B → both identities visible on `GET /auth/social/me/`.

## Landing ↔ App Paths

| Touchpoint | Anonymous | Authenticated (JWT in `localStorage`) |
| --- | --- | --- |
| `Navigation` (`MarketingAuthActions`) | **Log in** → `/login` | **Open App** → `/dashboard` |
| `MarketingStickyCta` (mobile) | **Log in** → `/login` | **Open App** → `/dashboard` |
| `HeroSection` inline link | **Log in** → `/login` | **Open app** → `/dashboard` |
| Waitlist success (`StepSubmit`) | **Approved? Enter app** → `/signup`; **Log in** → `/login` | Same CTAs (signup checks whitelist approval) |
| `/login` footer | Cross-link **Enter via signup** → `/signup` | Redirect to `/dashboard` (or `/onboarding` per S7) |
| `/signup` | Email whitelist check → wallet connect → SIWE | Redirect to `/dashboard` when approved + authed |
| `/onboarding` | Redirect to `/login` via `AuthGuard` | Social-only onboarding checklist (S7); wallet users skip |
| Protected app routes (`/dashboard`, etc.) | `AuthGuard` → `/login` | Content renders |

## Core QA Flows

1. Auth and profile
   - Login with the dev button, email OTP, social provider, or the wallet endpoint.
   - Visit `/dashboard` (or `/onboarding` for social-only once S7 is merged).
   - Expected: no auth redirect loop; profile-dependent panels render.

2. Admin access
   - Login as `qa-superadmin` or post wallet `...0001`.
   - Visit `/admin`.
   - Expected: overview cards and rubric form render.
   - Login with `qa-non-admin` via endpoint, set its `access` token in `localStorage.auth_token`, then visit `/admin`.
   - Expected: redirect or `403` behavior, not admin data.

3. Connected accounts
   - Visit `/sources`.
   - Connect/manual-test non-OAuth accounts if needed.
   - Expected: `/auth/social/me/` includes OAuth-backed and manual accounts once present.

4. Account analysis credits
   - Use an admin QA account with `team` or `pro` plan.
   - Try `/api/v1/judge/score-account/` with an invalid Twitter handle.
   - Expected: validation/fetch error before credits are deducted.
   - Try a valid handle only when `TWITTER_BEARER_TOKEN` and `ANTHROPIC_API_KEY` are configured.
   - Expected: NDJSON streaming events appear progressively and credits decrement only for a real scoring attempt.

5. Django admin sanity check
   - Open `/admin/` using `qa-superadmin`.
   - Verify the seeded user has `is_staff=True`, `is_superuser=True`, plan `team`, and credits `500`.

## Reset or Rotate

Re-run the seed command any time. It is idempotent and updates the same fake wallet accounts. To change the shared password:

```bash
QA_ACCOUNT_PASSWORD='new-local-password' \
UV_PROJECT_ENVIRONMENT=/tmp/airdrop-works-backend-venv \
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5434/airdrop_works \
REDIS_URL=redis://127.0.0.1:6378/0 \
DJANGO_SETTINGS_MODULE=config.settings.local \
uv run --extra dev python manage.py seed_qa_accounts
```
