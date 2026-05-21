#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "Phase 3 endpoint smoke (base: $BASE_URL)"

code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/api/v1/judge/demo/marketing/" \
  -H "Content-Type: application/json" \
  -d '{"text":"Launch week: 50% off Pro. Clear CTA. Join 10k builders."}')

if [[ "$code" == "200" ]]; then
  echo "OK POST /api/v1/judge/demo/marketing/ (HTTP 200)"
elif [[ "$code" == "503" ]]; then
  echo "WARN POST /api/v1/judge/demo/marketing/ (HTTP 503 — Anthropic unavailable)"
else
  echo "FAIL POST /api/v1/judge/demo/marketing/ (HTTP $code)"
  exit 1
fi

echo "Phase 2 regression..."
BASE_URL="$BASE_URL" "$(dirname "$0")/verify_phase2_endpoints.sh"
echo "Done."
