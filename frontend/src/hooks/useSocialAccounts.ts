'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/useNotificationStore';

export interface SocialAccount {
  platform: 'twitter' | 'discord' | 'telegram' | 'github';
  username: string;
  display_name?: string;
  connected_at: string;
  last_synced_at?: string;
}

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
      notify({
        type: 'success',
        title: 'Account connected',
        message: `${variables.platform} account linked successfully.`,
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

  return {
    accounts,
    connect,
    disconnect,
  };
}