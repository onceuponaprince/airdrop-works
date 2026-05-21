/**
 * Client-side auth gate for the (app) route group.
 * Redirects to /login when no auth_token is found in localStorage.
 * Replaces the previous edge-middleware approach so the app works
 * with Next.js rewrites proxy on Vercel (no middleware needed).
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        if (!cancelled) setStatus('denied');
        return;
      }

      api.setToken(token);
      try {
        await api.get('/auth/me/');
        if (!cancelled) setStatus('ok');
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
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

  if (status !== 'ok') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[--background]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[--primary] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
