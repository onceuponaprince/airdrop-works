#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "=== Phase 3 gate ==="
./scripts/verify_phase3_endpoints.sh

echo "=== Phase 2 regression ==="
./scripts/verify_phase2_gate.sh

echo "=== Phase 3 pytest ==="
docker compose run --rm backend uv run pytest apps/judge/tests/test_marketing.py -q --tb=line

echo "=== Phase 3 gate passed ==="
