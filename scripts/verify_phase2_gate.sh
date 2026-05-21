#!/usr/bin/env bash
# Phase 2 final gate — endpoint smoke + backend pytest slice (Docker).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "=== Phase 2 gate (BASE_URL=$BASE_URL) ==="

BASE_URL="$BASE_URL" ./scripts/verify_phase1_endpoints.sh
./scripts/verify_phase2_endpoints.sh

echo "=== Backend pytest (Docker) ==="
docker compose run --rm backend uv run pytest \
  apps/integrity/tests \
  apps/contributions/tests/test_tasks.py \
  apps/rewards/tests \
  apps/judge/tests/test_views.py \
  apps/ai_core/tests/test_service.py \
  -q --tb=line

echo "=== Phase 2 gate passed ==="
