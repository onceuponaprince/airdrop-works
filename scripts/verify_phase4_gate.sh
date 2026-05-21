#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "=== Phase 4 gate ==="
./scripts/verify_phase4_endpoints.sh

echo "=== Phase 3 regression ==="
./scripts/verify_phase3_gate.sh

echo "=== Rubric spec unit tests ==="
docker compose run --rm backend uv run pytest apps/judge/tests/test_rubric_catalog.py apps/judge/tests/test_rubric_spec.py -q --tb=line

echo "=== Rubric-eval harness ==="
python3 tools/rubric-eval/evaluate.py \
  --rubric schemas/rubric/v1/rubrics/performance_marketing_v1.json \
  --text "Launch week: 50% off Pro. Join 10k builders today." \
  --quiet

echo "=== Phase 4 gate passed ==="
