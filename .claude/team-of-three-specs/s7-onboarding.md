---
subsystem_id: s7-onboarding
files:
  - frontend/src/app/(app)/onboarding/page.tsx
  - frontend/src/components/app/OnboardingChecklist.tsx
  - frontend/src/hooks/useAuth.ts
estimate_loc: 150
mechanism: |
  Post-login /onboarding for social-only users: prompt optional wallet connect,
  display name, branch pick; redirect to /dashboard when complete or skipped.
acceptance_criteria:
  - "Social-only JWT lands on /onboarding not /dashboard"
  - "Wallet users skip onboarding"
  - "Skip persists in profile/local state"
commit_scope: frontend
parent_spec: .claude/team-of-three-specs/s6-identity-merge.md
---

# S7 — /onboarding page

Post-login destination for social-only users.
