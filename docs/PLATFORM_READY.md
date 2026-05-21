# Platform readiness — real usage checklist

The marketing site and waitlist work without Django auth. The **logged-in app** (`/judge`, `/dashboard`, `/quests`, `/leaderboard`) needs the stack below.

## Quick start (Docker)

```bash
cp .env.example .env
# Fill: SECRET_KEY, ANTHROPIC_API_KEY, and Particle wallet vars (see below)

docker compose up --build db redis backend celery celery-beat frontend

# One-time demo data (quests, leaderboard, sample users)
docker compose exec backend uv run python manage.py seed_demo
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Django API | http://localhost:8001/api/v1/ |
| Health | http://localhost:8001/api/v1/health/ |

## Required environment variables

### Minimum for app login + judge scoring

| Variable | Where | Purpose |
|----------|-------|---------|
| `SECRET_KEY` | `.env` | Django signing |
| `DATABASE_URL` | `.env` / compose | Postgres |
| `REDIS_URL` | `.env` / compose | Cache + Celery |
| `ANTHROPIC_API_KEY` | `.env` | AI Judge (backend) |
| `BACKEND_URL` | frontend (compose sets `http://backend:8000`) | Next.js API rewrite target |
| `NEXT_PUBLIC_PROJECT_ID` | frontend | Particle ConnectKit |
| `NEXT_PUBLIC_CLIENT_KEY` | frontend | Particle |
| `NEXT_PUBLIC_APP_ID` | frontend | Particle |

### Local dev without wallet (DEBUG only)

With `DEBUG=True` and SIWE not enforced, `/login` offers **Dev Login** when Particle env is missing. Backend accepts `dev-bypass` signature for `0x0000…0000`.

### Optional (full platform)

| Variable | Purpose |
|----------|---------|
| `TWITTER_BEARER_TOKEN` | Twitter account analysis (`/judge/score-account/`, Pro plan) |
| `STRIPE_*` | Credits / billing portal |
| `NEXT_PUBLIC_SUPABASE_*` | Waitlist only (marketing) |

## Auth flow

1. User connects wallet (Particle ConnectKit on Avalanche or Base).
2. Frontend builds SIWE message (`frontend/src/lib/siwe.ts`) and signs via wagmi.
3. `POST /api/v1/auth/wallet-verify/` returns JWT access + refresh.
4. `AuthGuard` validates token via `GET /api/v1/auth/me/`.
5. Disconnecting wallet clears JWT (`WalletSessionSync`).

## App routes vs marketing

| Surface | Judge API | Auth |
|---------|-----------|------|
| Landing demo | `POST /api/judge` (Next.js → Anthropic stream) | None |
| App `/judge` | `POST /api/v1/judge/score/` (Django, credits) | JWT |
| Dashboard history | `GET /api/v1/contributions/` | JWT |

Platform judge scores **persist** a `Contribution` row and award XP (educator branch for pasted text).

## Celery (crawl → score pipeline)

Crawlers enqueue work on Redis. Without `celery` + `celery-beat`, **manual judge paste still works**; automated Twitter/Discord/Telegram/Reddit ingestion does not.

```bash
docker compose up celery celery-beat
```

Configure crawl sources under **Sources** in the app, or use `POST /api/v1/contributions/crawl/twitter/` etc.

## Verify locally

```bash
# Backend judge + persistence tests
docker compose run --rm backend uv run pytest apps/judge/tests/test_views.py -q

# Phase 1 smoke (optional)
./scripts/verify_phase1_endpoints.sh
```

Manual smoke:

1. Open http://localhost:3000/login → connect wallet → sign message.
2. `/judge` → paste text → score → see result.
3. `/dashboard` → **Scoring History** shows the row.
4. `/quests` and `/leaderboard` load lists (seed_demo helps).

## Production notes

- Set `DEBUG=False`, strong `SECRET_KEY`, real `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS`.
- Enable SIWE verification (`ENFORCE_SIWE` per backend settings).
- Run Celery workers on the same Redis URL as the API.
- Frontend on Vercel: set `BACKEND_URL` to `https://api.airdrop.works` (or your API host).

## Known limits

- Waitlist signup uses **Supabase** directly; approval gating may still apply on `/signup`.
- Twitter **account** analysis requires Pro/Team plan and `TWITTER_BEARER_TOKEN`.
- `Dynamic.xyz` env vars in `.env.example` are legacy; production auth is **SIWE + Particle**.
