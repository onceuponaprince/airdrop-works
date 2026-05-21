#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8001}"
USER_TOKEN="${USER_TOKEN:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

echo "Phase 2 endpoint smoke (base: $BASE_URL)"

curl -sf "$BASE_URL/api/v1/health/" >/dev/null
echo "OK GET /api/v1/health/"

if [[ -n "$USER_TOKEN" ]]; then
  curl -sf "$BASE_URL/api/v1/contributions/sources/" \
    -H "Authorization: Bearer $USER_TOKEN" >/dev/null
  echo "OK GET /api/v1/contributions/sources/"
else
  echo "SKIP GET /api/v1/contributions/sources/ (set USER_TOKEN)"
fi

# Integrity wallet bundle (404 ok for unknown wallet)
code=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE_URL/api/v1/integrity/0x0000000000000000000000000000000000000000/")
if [[ "$code" == "200" || "$code" == "404" ]]; then
  echo "OK GET /api/v1/integrity/{wallet}/ (HTTP $code)"
else
  echo "FAIL GET /api/v1/integrity/{wallet}/ (HTTP $code)"
  exit 1
fi

if [[ -n "$ADMIN_TOKEN" ]]; then
  curl -sf "$BASE_URL/api/v1/integrity/export/?format=json" \
    -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null
  echo "OK GET /api/v1/integrity/export/"
else
  echo "SKIP integrity export (set ADMIN_TOKEN)"
fi

echo "Running Phase 1 regression..."
BASE_URL="$BASE_URL" ADMIN_TOKEN="$ADMIN_TOKEN" "$(dirname "$0")/verify_phase1_endpoints.sh"

echo "Done."
