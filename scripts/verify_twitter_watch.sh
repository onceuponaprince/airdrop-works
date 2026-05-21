#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8001}"

echo "Twitter watch smoke (base: $BASE_URL)"

code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/auth/twitter/start/?mode=login")
if [[ "$code" == "200" ]]; then
  echo "OK GET /api/v1/auth/twitter/start/?mode=login"
else
  echo "FAIL GET /api/v1/auth/twitter/start/ (HTTP $code)"
  exit 1
fi

echo "Done."
