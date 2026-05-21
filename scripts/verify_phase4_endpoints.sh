#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "Phase 4 endpoint smoke (base: $BASE_URL)"

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/judge/rubrics/")
if [[ "$code" == "200" ]]; then
  echo "OK GET /api/v1/judge/rubrics/"
else
  echo "FAIL GET /api/v1/judge/rubrics/ (HTTP $code)"
  exit 1
fi

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/judge/rubrics/schema/")
if [[ "$code" == "200" ]]; then
  echo "OK GET /api/v1/judge/rubrics/schema/"
else
  echo "FAIL GET /api/v1/judge/rubrics/schema/ (HTTP $code)"
  exit 1
fi

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/judge/rubrics/performance_marketing_v1/")
if [[ "$code" == "200" ]]; then
  echo "OK GET /api/v1/judge/rubrics/performance_marketing_v1/"
else
  echo "FAIL GET /api/v1/judge/rubrics/performance_marketing_v1/ (HTTP $code)"
  exit 1
fi

echo "Phase 3 regression..."
BASE_URL="$BASE_URL" "$(dirname "$0")/verify_phase3_endpoints.sh"
echo "Done."
