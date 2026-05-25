import type { Branch } from '@/lib/constants';

/** Shape returned by GET/PATCH `/api/v1/auth/me/`. */
export interface AuthUser {
  id: string;
  walletAddress?: string | null;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  shortAddress?: string;
  isStaff?: boolean;
  onboardingCompleted?: boolean;
  preferredBranch?: Branch | '' | null;
  createdAt?: string;
}

export function needsOnboarding(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.walletAddress) return false;
  return !user.onboardingCompleted;
}

export function postAuthPath(user: AuthUser | null | undefined): '/onboarding' | '/dashboard' {
  return needsOnboarding(user) ? '/onboarding' : '/dashboard';
}
