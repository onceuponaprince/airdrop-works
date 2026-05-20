# 002 — Wallet connect reliability

Owner: frontend-owner
Estimate: 1 day

Description:
- Improve wallet connect reliability and messaging across MetaMask (desktop+mobile) and WalletConnect. Ensure clear network requirement messages and actionable error states for user reattempt.

Tasks:
- Add end-to-end manual test checklist and record results.
- Improve `useParticleWallet` error handling to show actionable messages (e.g., switch network, install MetaMask).
- Add one-tap retry and reconnect UX.

Manual test checklist (run on desktop + mobile + WalletConnect):

- **Setup:** ensure staging frontend is deployed or run `npm run dev` in `frontend` and open the site.
- **MetaMask (desktop)**
	- Connect wallet: click `Connect` → choose MetaMask → expect connected address visible.
	- User rejects connect: cancel in MetaMask → UI shows warning "You rejected the wallet action" and `Try again` is offered. Capture screenshot.
	- Wrong network: switch extension to wrong chain → UI shows instruction to switch to Avalanche/Base. Capture screenshot.
	- Insufficient funds: simulate by selecting an account with zero balance (or mock) → UI shows "Insufficient funds". Capture screenshot.

- **MetaMask (mobile/browser)**
	- Connect via mobile deep link: verify flow opens wallet app and returns to site with connected address. Record short video (10s).

- **WalletConnect (mobile)**
	- Open WalletConnect QR → scan with a mobile wallet → expect connected address visible.
	- Simulate RPC timeout (toggle network offline) → UI shows network error with `Retry` option. Capture screenshot and video.

- **Retry flow**
	- When an actionable `Retry` or `Try again` is shown, click it and confirm ConnectKit modal reopens and connection can be retried. Record screen capture.

Placeholders for attachments (add files or links below):

- `docs/tickets/002-ux-wallet-connect/screenshots/metaMask-desktop-user-reject.png` (add capture)
- `docs/tickets/002-ux-wallet-connect/screenshots/walletconnect-timeout.png` (add capture)
- `docs/tickets/002-ux-wallet-connect/videos/metamask-mobile-connect.mp4` (add video)

Acceptance:
- Manual tests pass for MetaMask desktop, MetaMask mobile, and WalletConnect (recorded).
- Error messages are actionable and tests include screenshots/videos.

Automated tests:

- Added Vitest unit tests for wallet helpers: `src/providers/walletUtils.ts`.
- Run locally from `frontend` with:

	```bash
	cd frontend
	npm test -- src/providers/__tests__/particleProvider.spec.ts
	```

All helper unit tests pass in my run (7 tests).

Status: open
