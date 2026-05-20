# 003 — Claim CTA & success/failure states

Owner: frontend-owner
Estimate: 1 day

Description:
- Ensure the reward claim CTA is prominent and primary. Improve post-claim success UI (tx link, succinct confirmation) and failure handling (recover/ retry paths).

Tasks:
- Audit `LootChest` and claim pages for CTA prominence.
- Add success banner with tx hash link and clear next steps.
- Add retry/cancel flows and admin-visible error metadata.

Acceptance:
- Claim CTA passes WCAG color/contrast and is the primary action on claim screens.
- Success and failure flows tested on staging.

Status: open
