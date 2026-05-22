'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export type AppealStatus = 'pending' | 'upheld' | 'rejected';

export interface Appeal {
  id: string;
  subject: 'contribution' | 'account';
  status: AppealStatus;
  reason: string;
  contributionId: string | null;
  snapshotFarmingFlag: string;
  snapshotCompositeScore: number | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  walletAddress: string;
}

export interface CreateAppealInput {
  contributionId: string;
  reason: string;
}

export interface AppealsResponse {
  results: Appeal[];
}

interface AppealsState {
  items: Appeal[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Hook for managing score appeals — filing disputes on farming flags.
 *
 * @example
 * const { appeals, isLoading, fileAppeal, refresh } = useAppeals();
 * await fileAppeal({ contributionId: 'uuid', reason: 'Detailed explanation...' });
 */
export function useAppeals() {
  const [state, setState] = useState<AppealsState>({
    items: [],
    isLoading: false,
    isSubmitting: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setState((s) => ({ ...s, items: [], isLoading: false }));
        return;
      }
      api.setToken(token);
      const data = await api.get<AppealsResponse>('/integrity/appeals/me/');
      setState((s) => ({ ...s, items: data.results, isLoading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load appeals';
      setState((s) => ({ ...s, error: message, isLoading: false }));
    }
  }, []);

  const fileAppeal = useCallback(async (input: CreateAppealInput) => {
    setState((s) => ({ ...s, isSubmitting: true, error: null }));
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Authenticate before filing an appeal');
      api.setToken(token);

      // Minimum reason length validation (matches backend)
      if (!input.reason || input.reason.trim().length < 20) {
        throw new Error('Explanation must be at least 20 characters');
      }

      const created = await api.post<Appeal>('/integrity/appeals/', {
        contribution_id: input.contributionId,
        reason: input.reason.trim(),
      });

      setState((s) => ({
        ...s,
        items: [created, ...s.items],
        isSubmitting: false,
      }));
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit appeal';
      setState((s) => ({ ...s, error: message, isSubmitting: false }));
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    appeals: state.items,
    isLoading: state.isLoading,
    isSubmitting: state.isSubmitting,
    error: state.error,
    refresh,
    fileAppeal,
    clearError,
  };
}
