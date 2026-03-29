# AI(r)Drop — Deployment Guide

> Complete guide to deploying the AI(r)Drop MVP from local development to production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development (Quick Start)](#local-development)
3. [Docker Full-Stack (Recommended)](#docker-full-stack)
4. [Production Deployment](#production-deployment)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Database & Migrations](#database--migrations)
7. [Seed Demo Data](#seed-demo-data)
8. [Smart Contracts](#smart-contracts)
9. [Monitoring & Health Checks](#monitoring--health-checks)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Frontend runtime |
| pnpm | 9+ | Frontend package manager |
| Python | 3.12+ | Backend runtime |
| uv | latest | Python package manager (astral) |
| Docker | 24+ | Containerized deployment |
| Docker Compose | v2+ | Multi-service orchestration |
| PostgreSQL | 16 | Primary database (provided via Docker) |
| Redis | 7 | Cache + Celery broker (provided via Docker) |

**Optional:**
- Neo4j 5 (SPORE graph features)
- Anthropic API key (AI Judge scoring)
- Dynamic.xyz account (Web3 wallet auth)
- Supabase project (waitlist)
- Stripe account (billing)

---

## Local Development

### 1. Clone and set up environment file

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` and fill in your API keys. The minimum for a working demo:
- `SECRET_KEY` (any random string for dev)
- `ANTHROPIC_API_KEY` (for AI Judge demo)

### 2. Start the backend

```bash
cd backend

# Install Python dependencies
uv sync

# Start PostgreSQL and Redis (via Docker, or use local installs)
# If using Docker for just the data stores:
docker compose up db redis -d

# Run migrations
uv run python manage.py migrate

# Seed demo data (optional but recommended)
uv run python manage.py seed_demo

# Start the dev server
uv run python manage.py runserver
# → http://localhost:8000
```

### 3. Start the frontend (separate terminal)

```bash
cd frontend

# Install Node dependencies
pnpm install

# Start the dev server
pnpm dev
# → http://localhost:3000
```

### 4. Start Celery worker (separate terminal, for async tasks)

```bash
cd backend
uv run celery -A config worker -l info
```

### 5. Start Celery beat (separate terminal, for periodic tasks)

```bash
cd backend
uv run celery -A config beat -l info
```

---

## Docker Full-Stack

The simplest way to run everything together:

```bash
# Copy env file
cp .env.example .env
# Edit .env with your API keys

# Build and start all services
docker compose up --build

# In another terminal, seed demo data:
docker compose exec backend uv run python manage.py seed_demo
```

This starts:
- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:8000
- **PostgreSQL** → localhost:5434
- **Redis** → localhost:6378
- **Neo4j** → http://localhost:7474 (browser UI)
- **Celery worker** (async task processing)
- **Celery beat** (periodic task scheduling)

### Rebuilding after code changes

```bash
# Rebuild only the changed service
docker compose up --build frontend
docker compose up --build backend

# Or rebuild everything
docker compose up --build
```

### Viewing logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f celery
```

### Running management commands

```bash
docker compose exec backend uv run python manage.py migrate
docker compose exec backend uv run python manage.py seed_demo
docker compose exec backend uv run python manage.py createsuperuser
docker compose exec backend uv run python manage.py shell
```

---

## Production Deployment

### Architecture (Proxy-based)

The frontend proxies all `/api/v1/*` requests to Django via Next.js rewrites.
The browser never talks to Django directly — no CORS configuration needed.

```
[Internet]
    │
    └─→ [Vercel] ─→ Next.js (airdrop.works)
                     ├── Static pages + React app
                     ├── /api/judge (Anthropic AI proxy)
                     ├── /api/waitlist (Supabase)
                     └── /api/v1/* ──rewrites──→ [VPS] Django (api.airdrop.works)
                                                  ├── Celery Worker
                                                  ├── Celery Beat
                                                  ├── PostgreSQL
                                                  └── Redis
```

### Option A: Vercel Monorepo (Recommended)

Best for: production. Vercel handles frontend CDN + edge, Django runs on a VPS.

**Step 1: Deploy backend to a VPS**

```bash
# On your VPS
git clone <repo-url> /opt/airdrop-works
cd /opt/airdrop-works

cp .env.example .env
# Edit .env with production values

# Start backend services only
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d \
  backend db redis celery celery-beat

# Run migrations + seed
docker compose exec backend uv run python manage.py migrate --noinput
docker compose exec backend uv run python manage.py seed_demo
```

**Step 2: Deploy frontend to Vercel**

1. Push repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Vercel auto-detects the monorepo config from `vercel.json` (root dir = `frontend/`)
4. Set these environment variables in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | `https://api.airdrop.works` (your VPS URL) |
| `NEXT_PUBLIC_SITE_URL` | `https://airdrop.works` |
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | your Dynamic.xyz env ID |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
| `ANTHROPIC_API_KEY` | your Anthropic key (server-side) |
| `TWITTER_BEARER_TOKEN` | your Twitter key (server-side) |
| `RESEND_API_KEY` | your Resend key (server-side) |

5. Click Deploy — Vercel builds and serves the frontend
6. All `/api/v1/*` requests are proxied to your VPS via Next.js rewrites

**Step 3: Configure CORS on backend (optional)**

Since the proxy handles routing, CORS is not strictly needed. But for direct
API access (mobile apps, CLI tools), keep `CORS_ALLOWED_ORIGINS` in production.

### Option B: Docker Compose (VPS / Single Server)

Best for: small deployments, demos, or when you want everything on one box.

```bash
# 1. Clone repo on your server
git clone <repo-url> /opt/airdrop-works
cd /opt/airdrop-works

# 2. Create production env file
cp .env.example .env
# Edit .env with production values

# 3. Build and deploy with production overrides
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# 5. Run migrations and seed (first deploy only)
docker compose exec backend uv run python manage.py migrate --noinput
docker compose exec backend uv run python manage.py seed_demo
```

### SSL/TLS Setup

For the Docker Compose approach, update `nginx/nginx.conf`:
1. Place SSL certificates at paths referenced in the config
2. Or use Let's Encrypt with certbot:

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificates
certbot --nginx -d api.airdrop.works
```

---

## Environment Variables Reference

### Backend (`.env` — backend section)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Yes** | insecure-dev-key | Django secret key. Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | No | False | Enable debug mode (never True in production) |
| `ALLOWED_HOSTS` | **Prod** | localhost | Comma-separated hostnames |
| `DATABASE_URL` | **Yes** | postgresql://...localhost | Full PostgreSQL connection URL |
| `REDIS_URL` | **Yes** | redis://localhost:6379/0 | Redis connection URL |
| `CORS_ALLOWED_ORIGINS` | **Prod** | — | Frontend URL (e.g., https://airdrop.works) |
| `ANTHROPIC_API_KEY` | For scoring | — | Anthropic API key for AI Judge |
| `TWITTER_BEARER_TOKEN` | For crawling | — | Twitter API v2 bearer token |
| `DYNAMIC_API_KEY` | For wallet auth | — | Dynamic.xyz API key |
| `STRIPE_SECRET_KEY` | For billing | — | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For billing | — | Stripe webhook signing secret |
| `SENTRY_DSN` | For monitoring | — | Sentry error tracking DSN |
| `RESEND_API_KEY` | For email | — | Resend transactional email key |

### Frontend (`.env` — frontend section, or Vercel dashboard)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKEND_URL` | **Yes** | http://localhost:8000 | Django backend URL (server-side only, used by Next.js rewrites proxy) |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | http://localhost:3000 | Frontend URL (for OG images) |
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | For wallet | — | Dynamic.xyz environment ID |
| `NEXT_PUBLIC_SUPABASE_URL` | For waitlist | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For waitlist | — | Supabase anonymous key |
| `ANTHROPIC_API_KEY` | For AI demo | — | Server-side Anthropic key |
| `TWITTER_BEARER_TOKEN` | For analysis | — | Server-side Twitter key |
| `RESEND_API_KEY` | For email | — | Server-side Resend key |

---

## Database & Migrations

### Running migrations

```bash
# Local
cd backend && uv run python manage.py migrate

# Docker
docker compose exec backend uv run python manage.py migrate

# Check migration status
docker compose exec backend uv run python manage.py showmigrations
```

### Creating new migrations

```bash
cd backend
uv run python manage.py makemigrations
uv run python manage.py migrate
```

### Database backup (production)

```bash
# Dump
docker compose exec db pg_dump -U postgres airdrop_works > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U postgres airdrop_works < backup_20260328.sql
```

---

## Seed Demo Data

The `seed_demo` management command creates realistic demo data:
- 10 users with wallet addresses, display names, and profiles
- 30-80 scored contributions across Twitter, Discord, Telegram
- 8 active quests with various difficulty levels
- Loot chests and leaderboard rankings

```bash
# First seed
python manage.py seed_demo

# Re-seed (clears previous demo data first)
python manage.py seed_demo --flush
```

---

## Smart Contracts

Contracts are in `contracts/` using Hardhat + Diamond pattern (EIP-2535).

```bash
cd contracts

# Install dependencies
pnpm install

# Compile
pnpm compile

# Deploy to testnet (requires .env with private key + RPC URLs)
pnpm deploy:fuji      # Avalanche Fuji testnet
pnpm deploy:base-sep  # Base Sepolia testnet

# Verify on explorer
pnpm verify:fuji
pnpm verify:base-sep
```

See `contracts/DEPLOYMENT.md` for contract-specific deployment details.

---

## Monitoring & Health Checks

### Health check endpoint

```bash
# Returns { status: "ok", db: true, redis: true }
curl http://localhost:8000/api/v1/health/
```

### Celery monitoring

```bash
# Check active workers
docker compose exec celery celery -A config inspect active

# Check scheduled tasks
docker compose exec celery celery -A config inspect scheduled
```

### Logs

```bash
# Backend logs
docker compose logs -f backend

# Celery worker logs
docker compose logs -f celery

# All services
docker compose logs -f --tail=100
```

---

## Troubleshooting

### "Connection refused" on frontend → backend

The frontend expects the backend at `NEXT_PUBLIC_API_URL`. In Docker Compose, make sure:
- Backend runs on port 8000 (not 9000)
- Frontend's build arg `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
- If on a VPS, use the server's public IP or domain

### Migrations fail with "relation does not exist"

Run migrations in order:

```bash
docker compose exec backend uv run python manage.py migrate accounts
docker compose exec backend uv run python manage.py migrate
```

### AI Judge demo returns mock data

Set `ANTHROPIC_API_KEY` in the root `.env`. The judge API route falls back to mock responses when the key is missing.

### Wallet connect doesn't work

Set `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` in the root `.env`. Get it from https://app.dynamic.xyz/ (free tier).

Without it, the app shows a dev-mode warning banner and wallet functionality is disabled. The dev login bypass on `/login` works in development mode.

### Docker build fails for frontend

Ensure `output: "standalone"` is set in `next.config.ts`. This enables the production standalone build that the Dockerfile expects.

### Redis connection errors in Celery

Inside Docker Compose, Redis is at `redis://redis:6379/0` (hostname `redis`), not `localhost`. Check `REDIS_URL` in the root `.env`.

### CORS errors in browser

Check that `CORS_ALLOWED_ORIGINS` in the root `.env` matches your frontend URL exactly (including protocol and port).

---

## Quick Commands Reference

```bash
# ── Development ──
pnpm dev                                    # Frontend dev server
uv run python manage.py runserver           # Backend dev server
uv run celery -A config worker -l info      # Celery worker
uv run celery -A config beat -l info        # Celery beat scheduler

# ── Docker ──
docker compose up --build                   # Start everything
docker compose down                         # Stop everything
docker compose down -v                      # Stop + delete volumes (fresh start)
docker compose exec backend uv run python manage.py seed_demo  # Seed data

# ── Production ──
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# ── Maintenance ──
docker compose exec backend uv run python manage.py migrate
docker compose exec backend uv run python manage.py createsuperuser
docker compose exec db pg_dump -U postgres airdrop_works > backup.sql

# ── Linting ──
cd frontend && pnpm lint && pnpm type-check
cd backend && uv run ruff check . && uv run ruff format --check .
```
