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

- Journey tests under `tests/e2e/journeys/` run without Django by mocking `/api/v1/*`. App `/judge` uses `POST /api/v1/judge/score/` and `POST /api/v1/judge/score-account/`; marketing demo still uses `/api/judge` NDJSON.
- Wallet-provider E2E remains inherently flaky unless you fully control the provider (see `tests/e2e/helpers/mockEthereum.ts`).
