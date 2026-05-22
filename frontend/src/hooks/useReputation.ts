'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export type FarmingFlag = 'genuine' | 'farming' | 'ambiguous';

export interface ReputationBundle {
  walletAddress: string;
  compositeScore: number;
  teachingValue: number;
  originality: number;
  communityImpact: number;
  farmingFlag: FarmingFlag;
  farmingPercentage: number;
  contributionCount: number;
  scoredAt: string | null;
}

export interface HistoryItem {
  id: string;
  platform: string;
  contentUrl: string;
  contentPreview: string;
  teachingValue: number | null;
  originality: number | null;
  communityImpact: number | null;
  compositeScore: number | null;
  farmingFlag: FarmingFlag | null;
  xpAwarded: number;
  scoredAt: string | null;
}

export interface ReputationHistory {
  walletAddress: string;
  count: number;
  limit: number;
  offset: number;
  results: HistoryItem[];
}

export interface ProfileSnippet {
  totalXp: number;
  rank: number | null;
  primaryBranch: string | null;
  educatorXp?: number;
  builderXp?: number;
  creatorXp?: number;
  scoutXp?: number;
  diplomatXp?: number;
}

export interface PortableReputationExport {
  '@context': string;
  type: 'PortableReputationExport';
  specVersion: string;
  exportedAt: string;
  walletAddress: string;
  summary: ReputationBundle;
  profile: ProfileSnippet | null;
  history: HistoryItem[];
  meta: {
    historyCount: number;
    historyLimit: number;
  };
}

interface ReputationState {
  bundle: ReputationBundle | null;
  history: HistoryItem[];
  export: PortableReputationExport | null;
  isLoadingBundle: boolean;
  isLoadingHistory: boolean;
  isLoadingExport: boolean;
  error: string | null;
}

/**
 * Hook for fetching portable reputation data — wallet integrity bundle,
 * contribution history, and exportable reputation credentials.
 *
 * @param walletAddress — The Ethereum wallet address to query (0x...)
 *
 * @example
 * const { bundle, history, isLoading, load } = useReputation(wallet);
 * useEffect(() => { load(); }, [load]);
 */
export function useReputation(walletAddress: string | null) {
  const [state, setState] = useState<ReputationState>({
    bundle: null,
    history: [],
    export: null,
    isLoadingBundle: false,
    isLoadingHistory: false,
    isLoadingExport: false,
    error: null,
  });

  const loadBundle = useCallback(async () => {
    if (!walletAddress) return;
    setState((s) => ({ ...s, isLoadingBundle: true, error: null }));
    try {
      const data = await api.get<ReputationBundle>(`/integrity/${walletAddress}/`);
      setState((s) => ({ ...s, bundle: data, isLoadingBundle: false }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reputation';
      setState((s) => ({ ...s, error: message, isLoadingBundle: false }));
      return null;
    }
  }, [walletAddress]);

  const loadHistory = useCallback(
    async (limit = 50, offset = 0) => {
      if (!walletAddress) return;
      setState((s) => ({ ...s, isLoadingHistory: true, error: null }));
      try {
        const data = await api.get<ReputationHistory>(
          `/profiles/${walletAddress}/reputation/history/?limit=${limit}&offset=${offset}`
        );
        setState((s) => ({ ...s, history: data.results, isLoadingHistory: false }));
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load history';
        setState((s) => ({ ...s, error: message, isLoadingHistory: false }));
        return null;
      }
    },
    [walletAddress]
  );

  const loadExport = useCallback(
    async (historyLimit = 50) => {
      if (!walletAddress) return;
      setState((s) => ({ ...s, isLoadingExport: true, error: null }));
      try {
        const token = localStorage.getItem('auth_token');
        if (token) api.setToken(token);
        const data = await api.get<PortableReputationExport>(
          `/profiles/${walletAddress}/reputation/export/?history_limit=${historyLimit}`
        );
        setState((s) => ({ ...s, export: data, isLoadingExport: false }));
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load export';
        setState((s) => ({ ...s, error: message, isLoadingExport: false }));
        return null;
      }
    },
    [walletAddress]
  );

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    // Data
    bundle: state.bundle,
    history: state.history,
    export: state.export,

    // Loading states
    isLoadingBundle: state.isLoadingBundle,
    isLoadingHistory: state.isLoadingHistory,
    isLoadingExport: state.isLoadingExport,
    isLoading: state.isLoadingBundle || state.isLoadingHistory || state.isLoadingExport,

    // Error handling
    error: state.error,
    clearError,

    // Actions
    loadBundle,
    loadHistory,
    loadExport,
  };
}
