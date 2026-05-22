#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "=== Phase 5 gate (Wave 0) ==="
./scripts/verify_phase5_endpoints.sh

echo "=== Phase 4 regression ==="
./scripts/verify_phase4_gate.sh

echo "=== Reputation schema contract tests ==="
docker compose run --rm backend uv run pytest apps/integrity/tests/test_reputation_schema.py -q --tb=line

echo "=== Reputation history + export tests ==="
docker compose run --rm backend uv run pytest \
  apps/integrity/tests/test_reputation_history.py \
  apps/integrity/tests/test_reputation_export.py \
  -q --tb=line

echo "=== Integrity API tests ==="
docker compose run --rm backend uv run pytest apps/integrity/tests/test_views.py -q --tb=line

echo "=== Phase 5 Wave 0 gate passed ==="
