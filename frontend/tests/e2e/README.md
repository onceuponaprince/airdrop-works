Playwright E2E

Local

1. Install deps + browsers

```bash
cd frontend
pnpm install
pnpm e2e:install
```

2. Run E2E (boots Next.js automatically on :3001)

```bash
cd frontend
pnpm test:e2e
```

3. Debug UI mode / headed

```bash
cd frontend
pnpm test:e2e:ui
pnpm test:e2e:headed
```

Notes

- Journey tests under `tests/e2e/journeys/` are designed to run without the Django backend by mocking `/api/v1/*` and the streaming endpoints (`/api/judge`, `/api/twitter-analyze`).
- Wallet-provider E2E remains inherently flaky unless you fully control the provider (see `tests/e2e/helpers/mockEthereum.ts`).
