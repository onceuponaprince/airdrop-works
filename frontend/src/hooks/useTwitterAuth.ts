'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface TwitterConnectionStatus {
  connected: boolean;
  twitterUsername?: string;
  displayName?: string;
  avatarUrl?: string;
  watchEnabled?: boolean;
  useSeleniumFallback?: boolean;
  lastSyncedAt?: string | null;
  lastError?: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:8001';

export function useTwitterAuth() {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['twitter', 'connection'],
    queryFn: () => api.get<TwitterConnectionStatus>('/auth/twitter/me/'),
  });

  const connectMutation = useMutation({
    mutationFn: async (mode: 'link' | 'login' = 'link') => {
      const redirectUri =
        typeof window !== 'undefined'
          ? `${window.location.origin}/sources?twitter=connected`
          : 'http://localhost:3000/sources?twitter=connected';
      const params = new URLSearchParams({ mode, redirect_uri: redirectUri });
      const start = await api.get<{ authorizeUrl: string; state: string }>(
        `/auth/twitter/start/?${params.toString()}`
      );
      if (typeof window !== 'undefined') {
        window.location.href = start.authorizeUrl;
      }
      return start;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/auth/twitter/me/'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['twitter', 'connection'] }),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post<{ taskId: string }>('/auth/twitter/sync/'),
  });

  const patchMutation = useMutation({
    mutationFn: (body: { watchEnabled?: boolean; useSeleniumFallback?: boolean }) =>
      api.patch<TwitterConnectionStatus>('/auth/twitter/me/', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['twitter', 'connection'] }),
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    connect: connectMutation.mutateAsync,
    disconnect: disconnectMutation.mutateAsync,
    syncNow: syncMutation.mutateAsync,
    updateWatch: patchMutation.mutateAsync,
    callbackUrl: `${BACKEND_URL}/api/v1/auth/twitter/callback/`,
  };
}
