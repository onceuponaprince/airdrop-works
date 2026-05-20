Playwright E2E skeleton

Setup

1. Install Playwright test runner and browsers:

```bash
cd frontend
npm install -D @playwright/test
npx playwright install
```

2. Run the E2E suite:

```bash
cd frontend
npx playwright test
```

Notes

- These are skeleton tests to validate the wallet connect UI (Connect button, ConnectKit modal).
- Running real wallet flows (MetaMask, WalletConnect) requires interactive browsers and/or mobile devices and additional test harnessing.
