'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';

type UserCheckoutPayload =
  | { plan: 'pro' | 'team' }
  | { credit_pack: '50' | '200' };

export function useUserCheckout() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, token } = useWeb3Auth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (payload: UserCheckoutPayload) => {
      if (authLoading) return;

      if (!isAuthenticated || !token) {
        router.push('/login?next=/pricing');
        return;
      }

      setPending(true);
      setError(null);
      try {
        api.setToken(token);
        const data = await api.post<{ checkout_url: string }>(
          '/payments/user-checkout/',
          payload,
        );
        window.location.href = data.checkout_url;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to start checkout.');
      } finally {
        setPending(false);
      }
    },
    [authLoading, isAuthenticated, token, router],
  );

  return { startCheckout, pending, error, authLoading };
}
