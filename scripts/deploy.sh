#!/usr/bin/env bash
set -euo pipefail

# ── AI(r)Drop — Deploy / Redeploy ───────────────────────────────────────────
# Run from the repo root: ./scripts/deploy.sh
# Builds and starts backend services, runs migrations, seeds demo data.

echo "══════════════════════════════════════════════════════════"
echo "  AI(r)Drop — Deploying backend services"
echo "══════════════════════════════════════════════════════════"

# Pull latest code if this is a git repo
if [ -d .git ]; then
  echo "[1/5] Pulling latest code..."
  git pull --ff-only || echo "  ⚠ git pull failed — deploying current code"
else
  echo "[1/5] No git repo — deploying current code"
fi

# Build and start services (backend only — frontend is on Vercel)
echo "[2/5] Building and starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d \
  backend db redis celery celery-beat

# Wait for DB to be healthy
echo "[3/5] Waiting for database..."
for i in {1..30}; do
  if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
    echo "  ✓ Database ready"
    break
  fi
  sleep 1
done

# Run migrations
echo "[4/5] Running migrations..."
docker compose exec -T backend uv run python manage.py migrate --noinput

# Seed demo data (only on first deploy — harmless on re-runs due to get_or_create)
echo "[5/5] Seeding demo data..."
docker compose exec -T backend uv run python manage.py seed_demo

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  ✓ Deploy complete!"
echo ""
echo "  Backend API:  http://$(hostname -I | awk '{print $1}'):8000"
echo "  Health check: http://$(hostname -I | awk '{print $1}'):8000/health/"
echo ""
echo "  Logs:    docker compose logs -f backend"
echo "  Status:  docker compose ps"
echo "  Redeploy: ./scripts/deploy.sh"
echo "══════════════════════════════════════════════════════════"
