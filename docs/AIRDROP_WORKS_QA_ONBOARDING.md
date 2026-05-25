# AI(r)Drop Human QA Onboarding Guide

This guide is for people testing AI(r)Drop from the outside: founders, operators, QA testers, designers, or product reviewers. You do not need to understand the codebase to use it.

Use this guide to answer three questions:

1. Can a new user understand what AI(r)Drop does?
2. Can a user get from login to first value without getting stuck?
3. Can an admin/operator review the system and recover from common issues?

## Product Summary

AI(r)Drop helps Web3 campaigns reward real contribution instead of raw engagement. Users connect a wallet, link social accounts, submit or discover contributions, run AI scoring, earn XP, climb leaderboards, and unlock rewards. Admins can monitor campaigns, scoring, integrity, and operational health.

The main value promise is simple: contributors should be rewarded for quality, originality, teaching value, and community impact.

## Who Should Test

Use one of these mindsets while testing:

- New contributor: wants to know whether their activity can earn rewards.
- Campaign operator: wants to know whether a campaign can find real contributors.
- Admin reviewer: wants to know whether bad behavior, errors, and scoring issues are visible.
- Skeptical buyer: wants to know whether the product feels trustworthy enough to use for a real airdrop.

## Access You Need

Ask the operator for:

- Frontend URL, for example `https://staging.airdrop.works` or `http://localhost:3000`.
- API URL, for example `https://api-staging.airdrop.works` or `http://localhost:8001`.
- QA wallet account to use.
- QA bypass secret if testing a deployed environment without a real wallet signature.
- Optional Django admin username and password.

Never share the QA bypass secret in screenshots, tickets, public chat, or recordings.

## QA Accounts

The standard fake-wallet accounts are:

| Account | Wallet | Expected access |
| --- | --- | --- |
| `qa-superadmin` | `0x0000000000000000000000000000000000000000` | Full admin |
| `qa-admin-one` | `0x0000000000000000000000000000000000000001` | Full admin |
| `qa-admin-two` | `0x0000000000000000000000000000000000000002` | Full admin |
| `qa-non-admin` | `0x0000000000000000000000000000000000000010` | Normal user only |

For local development, the `Dev Login (no wallet)` button uses `qa-superadmin`.

For deployed QA, the operator must enable the QA bypass and give you a token or secret.

## Fast Login

### Local Browser Login

1. Open the frontend URL.
2. Go to `/login`.
3. Click `Dev Login (no wallet)` if it appears.
4. Expected result: you land on `/dashboard`.
5. Open `/admin`.
6. Expected result for admin accounts: admin overview loads.

### Deployed Browser Login With Token

If the deployed frontend cannot use a real wallet, ask the operator for a JWT or use the deployed API login command from `docs/QA_GUIDE.md`.

After you have an access token and refresh token:

1. Open the deployed frontend.
2. Open browser developer tools.
3. Go to the Console tab.
4. Run:

```js
localStorage.setItem('auth_token', '<ACCESS_TOKEN>')
localStorage.setItem('refresh_token', '<REFRESH_TOKEN>')
location.href = '/dashboard'
```

Expected result: the app opens as the seeded QA user.

## First 10 Minute Smoke Test

Run this first. Stop and file a blocker if any item fails.

1. Open the homepage.
   - Expected: the page explains AI(r)Drop quickly and has obvious calls to action.

2. Try the public AI Judge demo.
   - Expected: you can paste text and receive a score or a clear service-unavailable message.

3. Login.
   - Expected: no redirect loop, blank screen, or repeated wallet prompt.

4. Land on Dashboard.
   - Expected: you can see your progress, connected account prompt, XP or scoring context, and navigation.

5. Open Sources.
   - Expected: the page explains how to connect Twitter, Discord, Telegram, or manual sources.

6. Open AI Judge.
   - Expected: scoring flow is clear, errors are readable, and credit state is not confusing.

7. Open Quests.
   - Expected: quests are visible or an empty state explains what to do next.

8. Open Leaderboard.
   - Expected: leaderboard loads or an empty state explains that no scored users exist yet.

9. Open Notifications.
   - Expected: notifications load or show a clear empty state.

10. Open Settings.
    - Expected: profile/account options render, and logout or account actions are findable.

## Contributor Journey

Goal: prove a new contributor can understand and start earning.

1. Start at the homepage.
   - Check whether the value proposition is understandable in under 30 seconds.
   - Note any unclear terms or claims.

2. Go to Login.
   - Try wallet login if available.
   - If testing locally, use Dev Login.
   - Expected: authentication completes once, then redirects to Dashboard.

3. Review the Dashboard.
   - Look for the `Start earning` checklist.
   - Expected checklist steps: connect wallet, link social account, score first post, check leaderboard.

4. Visit Sources.
   - Try connecting or configuring a social source if available.
   - Expected: success and failure states are clear. Connected accounts should remain visible after refresh.

5. Visit AI Judge.
   - Submit a real-looking contribution, such as a helpful technical post or community update.
   - Expected: score includes useful feedback, not only a number.

6. Visit Quests.
   - Open a quest and check whether the task is understandable.
   - Expected: reward, difficulty, and next action are clear.

7. Visit Leaderboard.
   - Expected: user ranking or empty state is understandable.

Pass condition: a contributor can explain what they should do next without asking the team.

## Admin Journey

Use an admin QA account for this section.

1. Login as `qa-superadmin`, `qa-admin-one`, or `qa-admin-two`.
2. Open `/admin` in the app.
   - Expected: overview cards load.
   - Check users, contributions, unscored items, farming items, XP, and active crawlers.

3. Open Integrity Console.
   - Expected: integrity review tools load or show a clear empty state.
   - Look for farming or appeal workflows if test data exists.

4. Open Observability.
   - Expected: system health and metrics are understandable.

5. Open SPORE Lab.
   - Expected: workspace/graph tools load for admin users.

6. Open Onboarding.
   - Create a test workspace with a unique slug, for example `qa-acme-<date>`.
   - Optional: choose a demo seed scenario.
   - Expected: workspace is created or a clear validation error appears.

7. Open Django admin if available.
   - URL: `/admin/` on the API host.
   - Expected: admin login works for seeded admin accounts.

Pass condition: an operator can see enough state to diagnose account, scoring, and campaign issues.

## Non-Admin Access Check

Use `qa-non-admin` or a normal user.

1. Login as the non-admin user.
2. Open `/admin`.
   - Expected: access is denied or redirected.

3. Try staff pages such as `/console`, `/observability`, `/spore-lab`, and `/onboarding`.
   - Expected: no sensitive admin data is exposed.

File a high severity issue if a non-admin can view admin-only data.

## Marketing And Waitlist QA

1. Open the homepage on desktop.
   - Expected: headline, product purpose, and next action are clear.

2. Resize to mobile width.
   - Expected: no overlapping text, broken buttons, or impossible navigation.

3. Try the waitlist flow.
   - Expected: email, wallet, and social steps have clear validation.

4. Open Pricing.
   - Expected: plans and next action are clear. If checkout is not live, the waitlist fallback should be explicit.

5. Open Donate.
   - Expected: donation flow either works or clearly explains what is unavailable.

6. Open Developers/Rubrics.
   - Expected: rubric docs are readable and not too technical for an evaluator.

## AI Scoring QA

Test with three contribution types:

1. Strong contribution
   - Example: a useful explanation, tutorial, bug report, or product insight.
   - Expected: high teaching/originality/community score and specific reasoning.

2. Weak contribution
   - Example: `gm`, generic hype, copied announcement, or empty praise.
   - Expected: low score and farming/low-value signals.

3. Ambiguous contribution
   - Example: short but helpful comment, partial answer, or repost with added context.
   - Expected: nuanced score, not an extreme score without explanation.

Watch for:

- Scores that feel arbitrary.
- Feedback that does not match the input.
- Credit loss after failed external API calls.
- Loading states that make the app feel stuck.
- Errors that blame the user when the service is unavailable.

## Social Connection QA

1. Open Sources.
2. Try Twitter/X connection.
   - Expected: OAuth starts or configuration error is readable.

3. Try Discord connection.
   - Expected: OAuth starts or configuration error is readable.

4. Try Telegram.
   - Expected: bot/deep-link instructions are clear.

5. Refresh the page after connecting anything.
   - Expected: connected accounts still appear.

6. Try Disconnect.
   - Expected: account disappears and no stale checklist state remains.

## Mobile QA

Run the smoke test at a mobile viewport. Check:

- Navigation opens and closes.
- Buttons are tappable.
- Text does not overlap.
- Cards do not overflow horizontally.
- Long wallet addresses and usernames truncate cleanly.
- Modals and menus fit on screen.

## Accessibility And Trust Checks

Check these manually:

- Important buttons have readable labels.
- Error messages explain what happened and what to try next.
- Loading states are visible.
- Empty states are not dead ends.
- The app does not ask for sensitive wallet actions without context.
- Admin-only pages are not visible to normal users.

## Bug Report Template

Use this format for every issue:

```text
Title:
Environment: local / staging / production
Account used:
Browser and device:
Page or route:
Steps to reproduce:
Expected result:
Actual result:
Severity: blocker / high / medium / low
Screenshot or recording:
Console/API errors:
Notes:
```

## Severity Guide

Blocker:
- Cannot login.
- Main app cannot load.
- Admin or non-admin permissions are broken.
- Data loss, credit loss, or security-sensitive exposure.

High:
- Core scoring, sources, quests, or leaderboard flow is unusable.
- User can complete a task but receives misleading or stale status.
- Mobile layout blocks core actions.

Medium:
- Confusing copy, unclear empty state, slow response with recovery.
- Visual bugs that do not block the task.

Low:
- Cosmetic issues, minor spacing, minor wording improvements.

## Exit Criteria

A QA pass is acceptable when:

- New user can login and reach Dashboard.
- Start earning flow is understandable.
- AI Judge returns useful results or clear errors.
- Sources page handles connect, refresh, sync, and disconnect states.
- Quests, Leaderboard, Loot, Notifications, and Settings do not dead-end.
- Admin can access admin tools.
- Non-admin cannot access admin tools.
- Mobile smoke pass has no blocking layout issues.
- Any blocker or high severity issue has a ticket.

## Helpful Links

- Technical QA setup: `docs/QA_GUIDE.md`
- Product README: `README.md`
- Twitter watch docs: `docs/TWITTER_WATCH.md`
- Platform readiness notes: `docs/PLATFORM_READY.md`
