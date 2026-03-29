# AI(r)Drop

> Airdrops reward the wrong people. AI(r)Drop uses AI to reward what actually matters: genuine contribution.

**Domain:** [airdrop.works](https://airdrop.works)

## What is AI(r)Drop?

AI(r)Drop is a gamified airdrop scoring platform that uses an AI Judge (powered by Anthropic Claude) to evaluate Web3 contributions by quality rather than volume. It combines:

- **AI Judge** — Scores contributions across teaching value, originality, and community impact
- **Quest System** — Campaign-based tasks with reward pools and difficulty ratings
- **Skill Trees** — 5-branch progression system (Educator, Builder, Creator, Scout, Diplomat)
- **Leaderboard** — Global and per-branch rankings updated every 15 minutes
- **Loot System** — Reward chests with rarity tiers and animated opening mechanics
- **SPORE Engine** — Knowledge graph with spreading activation for content intelligence

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind + Framer Motion + shadcn/ui |
| Backend | Django 5 + DRF + Celery + Redis |
| Database | PostgreSQL 16 + Redis 7 + Neo4j 5 (optional) |
| AI | Anthropic Claude API (scoring + content generation) |
| Web3 Auth | Dynamic.xyz + wagmi + viem |
| Smart Contracts | EVM Diamond Pattern (EIP-2535) on Avalanche + Base |
| Deployment | Docker Compose (full-stack) or Vercel + Docker |

## Quick Start

```bash
# 1. Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Edit both files with your API keys

# 2. Full-stack via Docker (recommended)
docker compose up --build

# 3. Seed demo data
docker compose exec backend uv run python manage.py seed_demo

# Frontend → http://localhost:3000
# Backend API → http://localhost:8000
# Health check → http://localhost:8000/api/v1/health/
```

### Local Development (without Docker)

```bash
# Frontend (terminal 1)
cd frontend && pnpm install && pnpm dev

# Backend (terminal 2)
cd backend && uv sync && uv run python manage.py migrate && uv run python manage.py runserver

# Celery worker (terminal 3)
cd backend && uv run celery -A config worker -l info
```

## Project Structure

```
airdrop-works/
├── frontend/          # Next.js App Router (TypeScript + Tailwind)
│   ├── src/app/       # Pages: (marketing), (app), login, API routes
│   ├── src/components # UI components (marketing, app, shared, themed)
│   ├── src/hooks/     # React hooks (auth, judge, crawlers)
│   └── src/lib/       # API client, animations, constants
├── backend/           # Django 5 + DRF
│   ├── apps/          # accounts, judge, contributions, quests, profiles,
│   │                  # leaderboard, rewards, payments, spore, ai_core, core
│   ├── config/        # Settings, URLs, Celery, WSGI
│   └── common/        # Shared models, pagination, exceptions
├── contracts/         # Hardhat + Solidity (Diamond pattern)
├── nginx/             # Production reverse proxy config
├── docker-compose.yml # Dev: full-stack Docker
└── docker-compose.prod.yml # Production overrides
```

## Key Management Commands

```bash
# Seed demo data for demonstrations
python manage.py seed_demo

# Re-seed (flush + recreate)
python manage.py seed_demo --flush

# Create admin user
python manage.py createsuperuser
```

## API Endpoints

| Path | Description |
|------|-------------|
| `POST /api/v1/auth/wallet-verify/` | Wallet → JWT authentication |
| `POST /api/v1/judge/demo/` | Score contribution (public, rate-limited) |
| `GET /api/v1/quests/` | List active quests |
| `GET /api/v1/leaderboard/global/` | Global rankings |
| `GET /api/v1/profiles/me/` | Authenticated user profile |
| `GET /api/v1/rewards/loot/` | User's loot inventory |
| `GET /api/v1/health/` | Health check (DB + Redis) |

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Full deployment guide (local, Docker, production)
- **[CLAUDE.md](CLAUDE.md)** — Complete engineering reference and architecture
- **[RUNBOOK.md](RUNBOOK.md)** — Operational runbook
- **[contracts/DEPLOYMENT.md](contracts/DEPLOYMENT.md)** — Smart contract deployment

## Environment Variables

See `frontend/.env.local.example` and `backend/.env.example` for all variables. Minimum required:

| Variable | Where | Purpose |
|----------|-------|---------|
| `SECRET_KEY` | backend/.env | Django secret key |
| `ANTHROPIC_API_KEY` | frontend/.env.local | AI Judge scoring |
| `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` | frontend/.env.local | Wallet connect |

## License

Proprietary. All rights reserved.
