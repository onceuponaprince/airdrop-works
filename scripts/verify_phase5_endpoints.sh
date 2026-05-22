#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8001}"
WALLET="${VERIFY_WALLET:-0x0000000000000000000000000000000000000001}"

echo "Phase 5 endpoint smoke (base: $BASE_URL)"

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/integrity/not-a-wallet/")
if [[ "$code" == "400" ]]; then
  echo "OK GET /api/v1/integrity/<invalid>/ → 400"
else
  echo "FAIL invalid wallet expected 400, got $code"
  exit 1
fi

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/integrity/$WALLET/")
if [[ "$code" == "200" || "$code" == "404" ]]; then
  echo "OK GET /api/v1/integrity/<wallet>/ → $code"
else
  echo "FAIL wallet lookup expected 200|404, got $code"
  exit 1
fi

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/profiles/$WALLET/reputation/history/")
if [[ "$code" == "200" || "$code" == "404" ]]; then
  echo "OK GET /api/v1/profiles/<wallet>/reputation/history/ → $code"
else
  echo "FAIL reputation history expected 200|404, got $code"
  exit 1
fi

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/profiles/$WALLET/reputation/export/")
if [[ "$code" == "200" || "$code" == "404" ]]; then
  echo "OK GET /api/v1/profiles/<wallet>/reputation/export/ → $code"
else
  echo "FAIL reputation export expected 200|404, got $code"
  exit 1
fi

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/integrity/console/overview/")
if [[ "$code" == "401" || "$code" == "403" ]]; then
  echo "OK GET /api/v1/integrity/console/overview/ (unauthenticated) → $code"
else
  echo "FAIL console overview expected 401|403 without auth, got $code"
  exit 1
fi

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/integrity/appeals/me/")
if [[ "$code" == "401" || "$code" == "403" ]]; then
  echo "OK GET /api/v1/integrity/appeals/me/ (unauthenticated) → $code"
else
  echo "FAIL appeals me expected 401|403 without auth, got $code"
  exit 1
fi

echo "Phase 4 regression..."
BASE_URL="$BASE_URL" "$(dirname "$0")/verify_phase4_endpoints.sh"
echo "Done."
