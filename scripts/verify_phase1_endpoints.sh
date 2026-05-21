#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

echo "Phase 1 endpoint smoke (base: $BASE_URL)"

curl -sf "$BASE_URL/api/v1/judge/rubric/" >/dev/null
echo "OK GET /api/v1/judge/rubric/"

curl -sf "$BASE_URL/api/v1/quests/admin/campaigns/" ${ADMIN_TOKEN:+-H "Authorization: Bearer $ADMIN_TOKEN"} >/dev/null || true
echo "CHECK GET /api/v1/quests/admin/campaigns/ (auth may be required)"

if [[ -n "$ADMIN_TOKEN" ]]; then
  curl -sf "$BASE_URL/api/v1/admin/stats/" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null
  echo "OK GET /api/v1/admin/stats/"
  curl -sf "$BASE_URL/api/v1/contributions/admin/" -H "Authorization: Bearer $ADMIN_TOKEN" >/dev/null
  echo "OK GET /api/v1/contributions/admin/"
else
  echo "SKIP admin-only endpoints (set ADMIN_TOKEN to verify)"
fi

echo "Done."
