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
  });

  const sync = useMutation({
    mutationFn: () => api.post('/auth/social/sync/'),
    onSuccess: (data) => {
      notify({
        type: 'success',
        title: 'Sync started',
        message: (data as any)?.message || 'Scoring jobs queued for your accounts.',
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