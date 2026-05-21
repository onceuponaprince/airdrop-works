#!/usr/bin/env bash
# Bootstrap local platform stack for real app usage (not just waitlist).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env and fill required keys first."
  cp -n .env.example .env 2>/dev/null || true
  exit 1
fi

echo "Starting db, redis, backend, celery, celery-beat, frontend..."
docker compose up -d --build db redis backend celery celery-beat frontend

echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8001/api/v1/health/ >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Seeding demo data (quests, leaderboard)..."
docker compose exec -T backend uv run python manage.py seed_demo || true

echo ""
echo "Platform ready:"
echo "  App:     http://localhost:3000"
echo "  Login:   http://localhost:3000/login"
echo "  API:     http://localhost:8001/api/v1/"
echo ""
echo "See docs/PLATFORM_READY.md for env checklist and smoke tests."
