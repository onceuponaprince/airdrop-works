#!/usr/bin/env bash
# Post-deploy marketing funnel smoke (production or staging).
# Usage: BASE_URL=https://airdrop.works ./scripts/marketing_funnel_smoke.sh

set -euo pipefail

BASE_URL="${BASE_URL:-https://airdrop.works}"
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local pattern="${3:-}"
  local body
  body="$(curl -fsSL --max-time 25 "$url" 2>/dev/null || true)"
  if [[ -z "$body" ]]; then
    echo "FAIL: $name — no response from $url"
    FAIL=1
    return
  fi
  if [[ -n "$pattern" ]] && ! echo "$body" | grep -qE "$pattern"; then
    echo "FAIL: $name — pattern not found: $pattern"
    FAIL=1
    return
  fi
  echo "OK:   $name"
}

echo "Marketing funnel smoke — $BASE_URL"
echo ""

check "Landing loads" "$BASE_URL/" "Join the Waitlist|Join Waitlist"
check "Hero promise aligned" "$BASE_URL/" "email.*wallet|wallet.*email"
if curl -fsSL --max-time 25 "$BASE_URL/donate" 2>/dev/null | grep -q "TESTNET MODE"; then
  echo "FAIL: Donate page still shows TESTNET MODE"
  FAIL=1
else
  echo "OK:   Donate page has no testnet banner"
fi
check "Donate mainnet copy" "$BASE_URL/donate" "mainnet|Mainnet|Base"
check "Pricing waitlist CTA" "$BASE_URL/pricing" '/#waitlist|Join Waitlist'
check "Waitlist section" "$BASE_URL/#waitlist" "waitlist|Get in Early" || check "Waitlist on home" "$BASE_URL/" 'id="waitlist"'

count_json="$(curl -fsSL --max-time 15 "$BASE_URL/api/waitlist/count" 2>/dev/null || echo '{}')"
if echo "$count_json" | grep -q '"count"'; then
  echo "OK:   Waitlist count API returns JSON ($count_json)"
else
  echo "FAIL: Waitlist count API — $count_json"
  FAIL=1
fi

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo "All automated checks passed."
  echo ""
  echo "Manual GA funnel (after consent):"
  echo "  - marketing_demo_score → marketing_demo_complete"
  echo "  - waitlist_step_started → waitlist_submit_success"
  echo "  - twitter_analyze_complete → waitlist within session"
  echo "  - donate_started → donate_success"
  echo "  - pricing_plan_click"
  exit 0
fi
echo "One or more checks failed."
exit 1
