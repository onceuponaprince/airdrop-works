# Wallet UX Polish — Walkthrough & Deliverables

Owner: frontend-owner

Objective
- Run a focused 1-hour UX walkthrough covering wallet connect, onboarding, and reward claim flows; produce a prioritized 3-item polish list with acceptance criteria.

Walkthrough plan (60 minutes)
- 0–5m: Kickoff — goals, scope, recording consent
- 5–25m: Wallet connect flows
  - Test MetaMask in Chrome (desktop), MetaMask mobile, WalletConnect via a mobile wallet, and WalletConnect in desktop flows.
  - Checklist: connection success, clear messaging on network required, error paths (user rejects), reconnection behavior.
- 25–40m: Onboarding
  - Checklist: explicit wallet requirement messaging, account / profile mapping, CTA hierarchy, progressive disclosure for new users.
- 40–55m: Reward claim flow
  - Checklist: clear claim CTA, preview of gas/cost, ability to retry/cancel, success confirmation, link to tx explorer, admin/edge-case errors.
- 55–60m: Synthesis and prioritization
  - Each participant proposes top issues; facilitator ranks and records top 3 with rationales.

Recording & notes
- Record session video (screen + audio) and capture timestamped notes.
- Use this template for findings: Problem, Impact, Frequency, Repro steps, Suggested fix, Owner, Priority.

Deliverable: Prioritized 3-item polish list
- File: docs/wallet-ux-polish.md (this file)
- Format: ordered list with acceptance criteria and owner for each item.

Expected top items (examples)
1. Wallet connect reliability and messaging
   - Acceptance: successful connection in MetaMask desktop, MetaMask mobile, WalletConnect (tested with two mobile wallets); on error, show actionable message with one-tap retry. Tests: manual test matrix recorded.
   - Owner: frontend-owner
2. Clear claim CTA and success/failure states
   - Acceptance: claim CTA visible and primary on claim page; after claim, show succinct success banner with tx link; on failure show error and recover options.
   - Owner: frontend-owner
3. Gas estimation & confirmation UI
   - Acceptance: estimate displayed before signing; if estimated gas cost > configured threshold (e.g. > $5), show explicit confirmation and allow cancel. Owner: frontend-owner / web3-owner

Estimates
- Effort: 1–2 days to run walkthrough, synthesize findings, and implement the top-3 small UI polish items (or hand off tickets with acceptance criteria).

Next steps
- Run the 1-hour walkthrough, record it, and update this file with the final prioritized list (copy the top-3 items into TASKS_PHASE2.md and create tickets/PRs).

Findings (heuristic walkthrough performed 2026-05-20)

Summary: I performed a focused code + heuristic review of the wallet connect, onboarding, and reward claim UI in `frontend/src/components` (files inspected: `WalletButton.tsx`, `StepWallet.tsx`, `LootChest.tsx`). Below are timestamped findings, impact, repro steps, suggested fixes, owner, and priority.

1) Claim flow shows no gas estimate or pre-sign confirmation
  - Impact: users may sign costly txs unexpectedly; poor trust and potential refund/support load.
  - Repro: On `LootChest` click path (frontend), opening animation triggers optimistic succeed path; no gas estimate or confirmation displayed before sign.
  - Suggested fix: add gas-estimate helper and display USD estimate + require explicit confirmation if estimate > $5. Implement pre-sign confirmation modal.
  - Owner: frontend-owner / web3-owner
  - Priority: High

2) Claim CTA visibility and success/failure states are weak
  - Impact: primary action is a small "Click to open" label; post-claim shows only "Claimed!" without tx link or retry.
  - Repro: `LootChest` renders "Click to open" text and post-open shows "Claimed!" with no tx/hash link.
  - Suggested fix: make claim action an explicit primary button on claim screens, show success banner with tx hash and explorer link, and show actionable retry UI on failure.
  - Owner: frontend-owner
  - Priority: High

3) Wallet connect messaging and error handling can be improved
  - Impact: when provider unavailable or user rejects, messages are generic; users need clear next steps (install wallet, switch network, retry).
  - Repro: `WalletButton.tsx` renders disabled "Wallet Unavailable" with a title; `StepWallet.tsx` shows "Particle wallet provider not configured" but no install guidance.
  - Suggested fix: surface contextual messages (Install MetaMask, WalletConnect QR), add one-tap retry, and ensure `useParticleWallet` exposes error reasons to show actionable text.
  - Owner: frontend-owner
  - Priority: Medium

4) Failure handling in `LootChest.handleOpen` is optimistic and lacks error UI
  - Impact: network/RPC errors or backend failures produce no user-visible guidance.
  - Repro: `handleOpen` awaits a timeout then calls `onOpen` and sets `isOpen` to true; no try/catch.
  - Suggested fix: implement real mutation (POST `/rewards/loot/{id}/open`), wrap in try/catch, show loading spinner, and on error show retry/cancel with reason and report option.
  - Owner: frontend-owner / backend-owner
  - Priority: High

5) Accessibility & copy consistency
  - Impact: labels differ (`Connect` vs `Connect Wallet`), truncated addresses lack explicit aria-labels for screen readers.
  - Repro: `WalletButton` shows "Connect" while `StepWallet` shows "Connect Wallet"; address truncation appears in code blocks without aria labels.
  - Suggested fix: standardize copy, add `aria-label="Connected wallet: 0x..."` to connected button, ensure CTA contrast and keyboard focus states.
  - Owner: frontend-owner
  - Priority: Low

Prioritized 3-item polish list (recommendation)
1. Claim UX: add pre-sign gas estimate + explicit confirmation; implement success banner with tx link and retry flow. **Acceptance:** gas estimate visible before wallet signature; success banner includes tx link; retry works. **Owner:** frontend-owner / web3-owner. (High)
2. Claim CTA prominence and failure states: make claim button primary and accessible; add actionable failure UI. **Acceptance:** CTA passes contrast and is primary action; failures show retry/esc. **Owner:** frontend-owner. (High)
3. Wallet connect reliability & messaging: show install/switch-network guidance and one-tap retry; surface provider error reasons. **Acceptance:** tests for MetaMask desktop/mobile and WalletConnect recorded; messages guide users. **Owner:** frontend-owner. (Medium)

Recorded artifacts
- Files inspected: `frontend/src/components/shared/WalletButton.tsx`, `frontend/src/components/marketing/steps/StepWallet.tsx`, `frontend/src/components/app/LootChest.tsx`.
- Suggested tickets: created under `docs/tickets/` (see TASKS_PHASE2.md links).

Next steps
- Implement tickets 002–004 for the UX items; run manual cross-browser tests (MetaMask desktop, MetaMask mobile, WalletConnect with two mobile wallets). Capture video/screenshots and attach to tickets.

# Wallet UX Polish Notes

This document will capture findings from the 1-hour UX walkthrough and the prioritized 3-point polish list.

Scope:
- Wallet connect flows (MetaMask, WalletConnect)
- Onboarding: account creation, linking wallet to profile
- Reward claim flow: gas estimation, confirmation, error handling

Acceptance criteria (for each polish item):
- MetaMask and WalletConnect successfully connect on desktop and mobile.
- Reward claim UI shows estimated gas and a clear confirmation step.
- Error states display actionable guidance and retry paths.

Template for findings:
- Area: (wallet connect / onboarding / claim)
- Issue: short description
- Impact: high/medium/low
- Proposed fix: one-line
- Acceptance criteria: one-line test
- Owner: (team member)
- PR / Issue: link

Next steps:
- Schedule the 1-hour walkthrough and populate this file with notes.
- Open issues for each accepted fix and tag `frontend-owner`.
