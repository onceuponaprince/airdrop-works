---
subsystem_id: s5-login-ui
files:
  - frontend/src/app/login/page.tsx
  - frontend/src/components/shared/Navigation.tsx
  - frontend/src/components/marketing/MarketingAuthActions.tsx
  - frontend/src/components/marketing/MarketingStickyCta.tsx
  - frontend/src/components/marketing/HeroSection.tsx
  - frontend/src/components/marketing/steps/StepSubmit.tsx
  - frontend/src/components/shared/SocialLoginButtons.tsx
  - frontend/src/hooks/useEmailAuth.ts
  - frontend/src/app/signup/page.tsx
estimate_loc: 280
mechanism: |
  Refresh /login with email OTP + GitHub/Twitter/Discord/Telegram alongside wallet SIWE;
  wire landing ↔ app bridge (nav Log in / Open App, waitlist success CTAs, aligned post-auth
  redirects); route social-only users to /onboarding after auth (S7).
acceptance_criteria:
  - "Marketing nav shows Log in when anonymous, Open App when JWT present"
  - "Waitlist success links to /signup (approved) and /login"
  - "Post-auth default is /dashboard for wallet and approved signup (until S7 onboarding routing)"
  - "All five providers visible on /login"
  - "Email OTP uses Supabase client-side verify then backend JWT exchange"
commit_scope: frontend
parent_spec: .claude/team-of-three-specs/s4-github-oauth.md
---

# S5 — /login UI + landing ↔ app bridge

Depends on S2–S4 backend endpoints for email/social providers.

## Landing ↔ app bridge (partial — wallet auth today)

| Touchpoint | Behavior |
|------------|----------|
| `Navigation` | Log in / Open App via `MarketingAuthActions` |
| `MarketingStickyCta` | Log in on mobile; Open App only when authenticated |
| `HeroSection` | Inline Log in / Open app link |
| `StepSubmit` success | Approved? → `/signup`, Log in → `/login` |
| `/login` | Cross-link to `/signup` for approved waitlist users |
| `/signup` | Post-auth → `/dashboard` (aligned with `/login`) |

## Provider UI (requires S2–S4)

- `SocialLoginButtons.tsx` — GitHub, X, Discord, Telegram
- Email OTP panel on `/login` via `useEmailAuth`

## Post-auth routing (S7)

- Wallet users → `/dashboard`
- Social-only new users → `/onboarding` (S7 implements detection)
