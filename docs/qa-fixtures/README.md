# QA Fixture Pack (Airdrop Testing)

Prepared on: 2026-05-25

Use these payloads against:

- `POST /api/v1/integrity/allocate/` (admin JWT required)

## Files

- `test-identities.md`: admin, eligible, ineligible, and bad-history identities.
- `valid-small-recipients.json`: small valid wallet array.
- `invalid-recipient-list.json`: intentionally invalid body (`wallets` is not an array).
- `duplicate-heavy-recipients.json`: repeated wallet entries to test dedupe behavior.
- `malformed-wallet-set.json`: malformed/edge-case wallet strings.

## Quick Usage

```bash
curl -sS -X POST http://localhost:8001/api/v1/integrity/allocate/ \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @docs/qa-fixtures/valid-small-recipients.json
```

```bash
curl -sS -X POST http://localhost:8001/api/v1/integrity/allocate/ \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @docs/qa-fixtures/invalid-recipient-list.json
```

## Expected Results

- `valid-small-recipients.json`: HTTP `200`, with `results` rows for wallets that exist in your DB.
- `invalid-recipient-list.json`: HTTP `400` with `wallets must be an array of addresses.`
- `duplicate-heavy-recipients.json`: HTTP `200`; duplicates are processed as provided (no server dedupe in `allocate/`).
- `malformed-wallet-set.json`: HTTP `200`; malformed addresses are skipped by validation and should not appear in `results`.

## Environment Note

- `qa-superadmin` and `qa-non-admin` come from `seed_qa_accounts`.
- `0x2222...` (`genuine-user`) and `0x3333...` (`farmer-user`) are canonical allocation personas from test fixtures; create them in your environment if missing.
