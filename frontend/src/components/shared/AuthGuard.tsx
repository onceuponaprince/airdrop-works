/**
 * Client-side auth gate for the (app) route group.
 * Redirects to /login when no auth_token is found in localStorage.
 * Replaces the previous edge-middleware approach so the app works
 * with Next.js rewrites proxy on Vercel (no middleware needed).
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // Use a callback ref pattern to avoid the "setState in effect" lint rule.
  // We read localStorage synchronously on mount — no external subscription needed.
  const [checked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('auth_token');
  });

  useEffect(() => {
    if (!checked) {
      router.replace('/login');
    }
  }, [checked, router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[--background]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[--primary] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
