#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "=== Phase 5 gate ==="
./scripts/verify_phase5_endpoints.sh

echo "=== Phase 4 regression ==="
./scripts/verify_phase4_gate.sh

echo "=== Integrity + reputation test suite ==="
docker compose run --rm backend uv run pytest apps/integrity/tests/ -q --tb=line

echo "=== Phase 5 gate passed (0.6.0) ==="
