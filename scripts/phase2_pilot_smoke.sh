#!/usr/bin/env bash
# Phase 2 API pilot smoke — requires Docker backend on BASE_URL with seed_demo data.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8001}"
DEMO_WALLET="${DEMO_WALLET:-0x1234567890abcdef1234567890abcdef12345678}"

echo "Phase 2 pilot smoke (base: $BASE_URL, wallet: $DEMO_WALLET)"

# Dev JWT (DEBUG + ENFORCE_SIWE=false)
auth_json=$(curl -sf -X POST "$BASE_URL/api/v1/auth/wallet-verify/" \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\":\"$DEMO_WALLET\",\"message\":\"dev\",\"signature\":\"dev\"}")

access=$(echo "$auth_json" | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])" 2>/dev/null || true)
if [[ -z "${access:-}" ]]; then
  echo "FAIL wallet-verify (is DEBUG=True and backend up?)"
  exit 1
fi
echo "OK POST /api/v1/auth/wallet-verify/"

curl -sf "$BASE_URL/api/v1/integrity/$DEMO_WALLET/" >/dev/null
echo "OK GET /api/v1/integrity/{wallet}/ (seeded wallet)"

curl -sf "$BASE_URL/api/v1/contributions/sources/" \
  -H "Authorization: Bearer $access" >/dev/null
echo "OK GET /api/v1/contributions/sources/"

curl -sf "$BASE_URL/api/v1/contributions/" \
  -H "Authorization: Bearer $access" >/dev/null
echo "OK GET /api/v1/contributions/ (dashboard history)"

echo ""
echo "Manual UI pilot (record in docs/PHASE_2_VERIFICATION.md):"
echo "  1. /login → wallet or dev login"
echo "  2. /sources → connect source → Run now"
echo "  3. /dashboard → scored row from crawl (not only /judge paste)"
echo "  4. Staff: GET /api/v1/integrity/export/?format=csv"
echo "Pilot API smoke complete."
