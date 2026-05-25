'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useNotificationStore } from '@/stores/useNotificationStore';

export interface SocialAccount {
  platform: 'twitter' | 'discord' | 'telegram' | 'github';
  username: string;
  display_name?: string;
  connected_at: string;
  last_synced_at?: string;
  /** Present when OAuth connection last reported a crawler/auth error */
  last_error?: string;
}

const PLATFORM_LABELS: Record<SocialAccount['platform'], string> = {
  twitter: 'Twitter / X',
  discord: 'Discord',
  telegram: 'Telegram',
  github: 'GitHub',
};

const FIRST_CONNECT_XP = 50;

export function useSocialAccounts() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore((s) => s.push);

  const accounts = useQuery<SocialAccount[]>({
    queryKey: ['social-accounts'],
    queryFn: () => api.get<SocialAccount[]>('/auth/social/me/'),
  });

  const connect = useMutation({
    mutationFn: (data: { platform: string; external_id: string; username?: string; display_name?: string }) =>
      api.post('/auth/social/connect/', data),
    onSuccess: (_, variables) => {
      const previous =
        queryClient.getQueryData<SocialAccount[]>(['social-accounts']) ?? [];
      const isFirstAccount = previous.length === 0;
      const platform =
        variables.platform as SocialAccount['platform'];
      const platformLabel = PLATFORM_LABELS[platform] ?? variables.platform;

      if (isFirstAccount) {
        toast({
          title: 'First source linked!',
          description: `+${FIRST_CONNECT_XP} XP for connecting ${platformLabel}`,
        });
      }

      notify({
        type: 'success',
        title: isFirstAccount ? `+${FIRST_CONNECT_XP} XP earned` : 'Account connected',
        message: isFirstAccount
          ? `${platformLabel} linked — welcome to the contributor loop.`
          : `${platformLabel} account linked successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'Connection failed',
        message: err instanceof Error ? err.message : 'Could not connect account',
      });
    },
  });

  const disconnect = useMutation({
    mutationFn: (platform: string) => api.post('/auth/social/disconnect/', { platform }),
    onSuccess: (_, platform) => {
      notify({
        type: 'success',
        title: 'Account disconnected',
        message: `${platform} account removed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'Disconnect failed',
        message: err instanceof Error ? err.message : 'Could not disconnect account',
      });
    },
  });

  const sync = useMutation({
    mutationFn: () => api.post('/auth/social/sync/'),
    onSuccess: (data) => {
      const message =
        typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message?: unknown }).message ?? '')
          : '';
      notify({
        type: 'success',
        title: 'Sync started',
        message: message || 'Scoring jobs queued for your accounts.',
      });
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'Sync failed',
        message: err instanceof Error ? err.message : 'Could not sync accounts',
      });
    },
  });

  return {
    accounts,
    connect,
    disconnect,
    sync,
  };
}