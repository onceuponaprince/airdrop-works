# Test Identities

Prepared on: 2026-05-25

## 1) Admin account

- Username: `qa-superadmin`
- Wallet: `0x0000000000000000000000000000000000000000`
- Access: full admin
- Source: `seed_qa_accounts`

## 2) Normal eligible user

- Username: `genuine-user` (allocation test persona)
- Wallet: `0x2222222222222222222222222222222222222222`
- Expected behavior: should classify as eligible (non-`exclude`) when contribution history is genuine with solid scores.
- Source pattern: `backend/apps/integrity/tests/test_allocation.py`

## 3) Ineligible user

- Username: `qa-non-admin`
- Wallet: `0x0000000000000000000000000000000000000010`
- Expected behavior: in strict allocation, typically `exclude` when no scored contributions exist.
- Source: `seed_qa_accounts`

## 4) Wallet/account with bad input history (negative tests)

- Username: `farmer-user` (allocation test persona)
- Wallet: `0x3333333333333333333333333333333333333333`
- Expected behavior: high farming pattern should classify as `exclude` under `airdrop_strict`.
- Source pattern: `backend/apps/integrity/tests/test_allocation.py`

## Notes

- `qa-superadmin` and `qa-non-admin` are deterministic via `python manage.py seed_qa_accounts`.
- `genuine-user` and `farmer-user` are canonical test personas from allocation tests. If they do not exist in your target environment, create equivalent users with the same wallet addresses and contribution profiles.

