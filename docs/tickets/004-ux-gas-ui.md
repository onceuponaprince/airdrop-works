# 004 — Gas estimation & confirmation UI

Owner: frontend-owner / web3-owner
Estimate: 1 day

Description:
- Surface gas estimates before sign/confirmation. If estimated cost exceeds threshold, require explicit confirmation and display USD estimate.

Tasks:
- Add gas-estimate helper on claim flow and display before wallet signature.
- Add configurable threshold (default: $5) to require explicit confirmation.
- Show USD conversion and warn when costs are high.

Acceptance:
- Gas estimate appears before signature and threshold confirmation works in staging tests.

Status: open
