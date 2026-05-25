# QA Session 01 — Local walkthrough

**Date:** 2026-05-25
**Tester:** Cursor agent (Claude Opus 4.7) via cursor-ide-browser MCP + shell
**Mode:** Structured QA playbook (see user prompt 2026-05-25 ~15:07)
**Git SHA:** `ffbb271ea9b5070f2e4cf3291672cebbc36bd2c2` (branch `main`)
**Last commit:** `chore: sync local work before airdrop testing` (Prince John, 2026-05-25 ~14:08)
**Evidence folder:** `/tmp/airdrop-works-qa-20260525-150915`
**Reporting cadence:** Running chat updates + this file

---

## Environment decision

**Picked: LOCAL.**

- Original "staging" target (`airdrop.works`) is unreachable — see Finding F-001 below.
- All QA fixtures and `seed_qa_accounts` are local-only.
- Plan:
  - Docker Compose for data services (postgres, redis, neo4j).
  - Bare-metal `pnpm` + `uv` for app code so gate failures are inspectable and we don't re-trigger the root-owned-modules issue.

### Tooling versions

| Tool | Version |
|------|---------|
| pnpm | 10.33.0 |
| node | v25.9.0 (bleeding edge — may cause warnings) |
| uv | 0.9.18 |
| Python | 3.14.4 |
| Docker | 29.3.0 |
| Docker Compose | v5.1.0 |

### docker-compose services discovered

`redis`, `db`, `backend`, `celery`, `celery-beat`, `frontend`, `neo4j`

### Env files present

- `.env`, `.env.example`, `.env.local` at repo root
- `backend/.env`, `backend/.env.example`, `backend/.env.production`
- `frontend/.env.local`

### Test identities (from `docs/qa-fixtures/test-identities.md`)

| Role | Username | Wallet |
|------|----------|--------|
| Admin | `qa-superadmin` | `0x0000…0000` |
| Eligible | `genuine-user` | `0x2222…2222` |
| Ineligible | `qa-non-admin` | `0x0000…0010` |
| Bad history | `farmer-user` | `0x3333…3333` |

### Test data (from `docs/qa-fixtures/`)

- `valid-small-recipients.json` — 3 wallets, `airdrop_strict` preset
- `invalid-recipient-list.json` — `wallets` is a string (expect HTTP 400)
- `duplicate-heavy-recipients.json` — 9 entries / 3 unique
- `malformed-wallet-set.json` — 10 edge cases (empty, non-hex, wrong length, whitespace, newline, uppercase prefix)

---

## Severity legend

- **S1** — broken core path, data loss risk, or security issue (block release)
- **S2** — degraded experience on a core path or any auth/payment surface
- **S3** — bug on a non-critical path or visible polish/UX issue
- **S4** — nit, copy, micro-a11y, or "would be nice"

---

## Findings (live)

### F-001 — `airdrop.works` returns `ERR_SSL_PROTOCOL_ERROR` — **S1 if prod is supposed to be live**

- Browser MCP navigation to `https://airdrop.works/` shows Chrome's "Connection Failed / ERR_SSL_PROTOCOL_ERROR (-107)" page.
- DNS resolved (the browser got far enough to attempt TLS), so this is a TLS endpoint misconfiguration, not a DNS outage.
- From the agent's sandboxed shell, both `airdrop.works` and `airdropme.co` fail `curl` with "Could not resolve host" — but that's the sandbox's DNS allowlist, not evidence about the live host.
- **Repro**: open `https://airdrop.works/` in any clean Chromium.
- **Evidence**: `qa-evidence/prod-tls-error.png` (saved during initial recon at 2026-05-25 15:06 UTC).
- **Suspected cause**: cert expired / SNI not configured / `https` listener not bound on the load balancer.
- **Action for user**: confirm whether airdrop.works is intended to be serving today. If yes → page the ops owner. If no (still pre-launch / DNS placeholder) → demote to S3 and add to launch checklist.

### F-002 — Stray root-level `pnpm-lock.yaml` stub — **S4**

- Untracked file at repo root, 10 lines, contains only `importers: . : {}`.
- The real frontend lockfile is `frontend/pnpm-lock.yaml` (494 KB).
- Likely created by a stray `pnpm install` run at the repo root. Should be removed (or, if intentional, the root should be turned into a proper pnpm workspace with `pnpm-workspace.yaml`).
- **Action**: `rm pnpm-lock.yaml` at repo root after confirming with project owner.

### F-003 — Stale `node_modules.root-owned-20260525/` in git status — **S4 (already resolved, ignore)**

- `git status` listed `frontend/node_modules.root-owned-20260525/` as untracked, but `ls` shows the directory no longer exists. Git is reporting cached state.
- Mentioned only so the audit trail explains why we didn't need to deal with it.

### F-004 — `pnpm lint` returns 7 errors + 7 warnings — **RESOLVED (stale capture)**

**Resolution (2026-05-25 15:30 UTC):** Re-ran `eslint .` against current `frontend/` at git `ffbb271ea`. Exit code 0, zero errors, zero warnings, zero output lines. All 5 files referenced in the original output had already been refactored to use lazy-init `useState` patterns / properly-typed Solana provider / individually-selected store actions. The pasted lint output was from a pre-refactor commit. Lint gate is GREEN.

Evidence: `/tmp/airdrop-works-qa-20260525-150915/gate-02-lint-full.log` (0 lines, exit 0).

---

#### Original capture (kept for audit)



User-supplied lint output (2026-05-25, post-clean install). The lint gate is RED, which per the user's own playbook rule ("Do not do UI QA on a broken build") blocks UI QA pending fixes. Errors only listed below (warnings omitted for brevity):

| File | Line | Rule | Issue |
|---|---|---|---|
| `frontend/src/app/(app)/quests/page.tsx` | 89 | `react-hooks/purity` | `Date.now()` called during render (impure function). |
| `frontend/src/app/(marketing)/donate/page.tsx` | 143 (×2) | `@typescript-eslint/no-explicit-any` | Two stray `any` types. |
| `frontend/src/components/marketing/WaitlistForm.tsx` | 73 | `react-hooks/set-state-in-effect` | `setSignupIntent` called synchronously inside an effect → cascading renders. |
| `frontend/src/hooks/useDonate.ts` | 59 (×2) | `@typescript-eslint/no-explicit-any` | Two stray `any` types. |
| `frontend/src/hooks/useNotifications.ts` | 53 | `react-hooks/preserve-manual-memoization` | `useCallback` dep `[store.fetchNotifications]` doesn't match the inferred `[store]`; React Compiler skipped optimizing. |

- **Suspected severity**: S2 — the build itself may still pass (`next build` is more permissive than ESLint), but the lint gate is broken and the WaitlistForm + quests page issues are real correctness smells (cascading renders + non-deterministic render order).
- **Action**: triage list separately. The cleanest fixes are likely:
  - Quests: move `Date.now()` outside render or into `useState`/`useMemo`.
  - WaitlistForm: replace the effect+setState pattern with a `useState` lazy initializer (the code already does this for `signupIntent` — line 73 looks like dead code from a previous iteration; verify).
  - Donate / useDonate: replace `any` with proper SDK types from `@solana/web3.js` / `viem`.
  - useNotifications: align the memoization dep to `[store]` and let the compiler infer.

### F-006 — `pnpm build` blocked by root-owned `frontend/.next/` from prior Docker run — **S2 (blocks release gate)**

- `next build` fails with `EACCES: permission denied, unlink '/home/onceuponaprince/code/airdrop-works/frontend/.next/build/package.json'`.
- `stat` confirms the file is owned by `uid=65534 (nobody) gid=65534 (nogroup)`, created 2026-05-23 15:48:47. This is what host-root files look like from inside a user-namespace sandbox.
- Affects the entire `.next/server/` subtree, hundreds of files. `chmod -R` returns "Operation not permitted" for each.
- This is the **same class of issue** as F-003 — a Docker container ran as root in the past and wrote files into the workspace that the host user can no longer touch.
- The agent's sandbox cannot escalate; non-interactive `sudo -n` confirms a password is required.

**Action required from user**:

```bash
sudo rm -rf /home/onceuponaprince/code/airdrop-works/frontend/.next
```

After cleanup, the build gate can be re-run.

**Long-term fix (separate ticket):** add a `user:` directive to `frontend` service in `docker-compose.yml` so containers write files as the host user UID/GID, not root. Same fix would also prevent F-003 recurrence.

---

### F-005 — `pnpm install --frozen-lockfile` fails without `CI=true` — **S3 (DX)**

- Running `pnpm install --frozen-lockfile` in this workspace prompts to purge the existing `node_modules` for the new lockfile, but there's no TTY in subprocess invocations, so pnpm aborts with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`.
- **Workaround**: set `CI=true` (or `confirmModulesPurge=false` in `.npmrc`) before invoking pnpm.
- **Action**: add `CI=true` to the QA / release scripts that invoke pnpm install, and document in [`docs/qa-and-user-flow.md`](../qa-and-user-flow.md) §1.2 once we revisit the local-gates section.

---

## Playbook progress

### Prep
- [x] Environment chosen: local
- [x] Evidence folder created: `/tmp/airdrop-works-qa-20260525-150915`
- [x] Test identities documented (already in repo)
- [x] Test data fixtures verified (already in repo)

### Local Gates
- [ ] `pnpm install --frozen-lockfile` (frontend)
- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm test` (vitest unit)
- [ ] `pnpm build`
- [ ] Backend: `uv sync` + `uv run ruff check` + `uv run pytest` (selective)

### Boot the app
- [ ] `docker compose up -d db redis neo4j`
- [ ] Backend migrations + `seed_qa_accounts` + `seed_demo`
- [ ] Backend dev server
- [ ] Frontend dev server
- [ ] Baseline screenshot

### Core Smoke Pass — pending gates ✅
### Admin / Ops Pass — pending gates ✅
### Security / Negative Pass — pending gates ✅
### Cross-Browser / Responsive — pending gates ✅
### API / Network Checks — runs during smoke
### Performance Sanity — runs during smoke

---

## Go / No-Go (final)

_to be filled at end of session_

| Check | State |
|-------|-------|
| Build/test gates green | ⏳ |
| Core claim path works E2E | ⏳ |
| Ineligible + signed-out states correct | ⏳ |
| No protected data leaks | ⏳ |
| No blocking console/network failures | ⏳ |
| Mobile layout usable | ⏳ |
| Admin import/publish stable | ⏳ |
