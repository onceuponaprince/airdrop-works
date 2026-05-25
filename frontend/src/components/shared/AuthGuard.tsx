/**
 * Client-side auth gate for the (app) route group.
 * Redirects to /login when no auth_token is found in localStorage.
 * Redirects social-only users with incomplete onboarding to /onboarding.
 */
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { needsOnboarding, type AuthUser } from '@/lib/onboarding';

function getAuthStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    return typeof storage?.getItem === 'function' ? storage : null;
  } catch {
    return null;
  }
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const storage = getAuthStorage();
      const token = storage?.getItem('auth_token');
      if (!token) {
        if (!cancelled) setStatus('denied');
        return;
      }

      api.setToken(token);
      try {
        const profile = await api.get<AuthUser>('/auth/me/');
        if (!cancelled) {
          setUser(profile);
          setStatus('ok');
        }
      } catch {
        storage?.removeItem('auth_token');
        storage?.removeItem('refresh_token');
        api.setToken(null);
        if (!cancelled) setStatus('denied');
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status === 'denied') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'ok' || !user) return;

    const onOnboardingPage = pathname === '/onboarding';

    if (needsOnboarding(user) && !onOnboardingPage) {
      router.replace('/onboarding');
      return;
    }

    if (!needsOnboarding(user) && onOnboardingPage) {
      router.replace('/dashboard');
    }
  }, [status, user, pathname, router]);

  if (status !== 'ok') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[--background]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[--primary] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
