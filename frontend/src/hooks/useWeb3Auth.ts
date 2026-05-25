'use client';

/**
 * Wallet-backed auth hook. Persists JWT in localStorage, loads profile
 * via React Query, and exposes login/logout. Auth guard is handled by
 * the client-side AuthGuard component (no edge middleware).
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuthUser } from '@/lib/onboarding';
import type { AuthTokens } from '@/types/api';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
}

export function useWeb3Auth(): AuthState & {
  login: (walletAddress: string, message: string, signature: string) => Promise<void>;
  applySession: (access: string, refresh: string) => void;
  logout: () => void;
} {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  });
  const [error, setError] = useState<Error | null>(null);
  const [isAuthActionLoading, setIsAuthActionLoading] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery<AuthUser | null>({
    queryKey: ['auth', 'profile'],
    queryFn: async () => {
      if (!token) return null;
      api.setToken(token);
      return api.get<AuthUser>('/auth/me/');
    },
    enabled: token !== null,
  });

  const applySession = (access: string, refresh: string) => {
    localStorage.setItem('auth_token', access);
    localStorage.setItem('refresh_token', refresh);
    api.setToken(access);
    setToken(access);
    setError(null);
  };

  const login = async (walletAddress: string, message: string, signature: string) => {
    try {
      setIsAuthActionLoading(true);
      setError(null);

      const response = await api.post<AuthTokens>('/auth/wallet-verify/', {
        wallet_address: walletAddress,
        message,
        signature,
      });

      localStorage.setItem('auth_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      api.setToken(response.access);
      setToken(response.access);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Auth failed');
      setToken(null);
      setError(err);
      throw err;
    } finally {
      setIsAuthActionLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    api.setToken(null);
    setToken(null);
    setError(null);
  };

  const state: AuthState = useMemo(
    () => ({
      isAuthenticated: token !== null,
      token,
      user: user ?? null,
      loading: isAuthActionLoading || userLoading,
      error,
    }),
    [token, user, userLoading, isAuthActionLoading, error]
  );

  return { ...state, login, applySession, logout };
}
