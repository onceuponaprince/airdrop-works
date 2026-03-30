'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface UserSubscription {
  plan: string;
  status: string;
  monthly_credits: number;
  credits_remaining: number;
  credits_reset_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  portal_available: boolean;
}

export function useCredits() {
  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<UserSubscription>('/payments/user-subscription/');
      setSub(data);
    } catch {
      // not authenticated or endpoint unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    sub,
    loading,
    refresh,
    credits: sub?.credits_remaining ?? 0,
    plan: sub?.plan ?? 'free',
  };
}
