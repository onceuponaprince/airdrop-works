'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export interface ConsoleOverview {
  walletsWithScores: number;
  scoredContributions: number;
  averageCompositeScore: number;
  farmingRatePercent: number;
  pendingAppeals: number;
  resolvedAppeals: number;
}

export interface ConsoleWalletRow {
  walletAddress: string;
  compositeScore: number;
  teachingValue: number;
  originality: number;
  communityImpact: number;
  farmingFlag: string;
  farmingPercentage: number;
  contributionCount: number;
  scoredAt: string | null;
  tier?: string;
  recommendedAction?: string;
  allocationWeight?: number;
  rationale?: string;
  appealEligible?: boolean;
}

export interface AllocationPreset {
  key: string;
  label: string;
  description: string;
  useCase: string;
}

function staffGet<T>(path: string): Promise<T> {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Staff authentication required');
  api.setToken(token);
  return api.get<T>(path);
}

export function useProtocolConsole() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await staffGet<ConsoleOverview>('/integrity/console/overview/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load overview';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWallets = useCallback(async (preset?: string, limit = 50, offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (preset) params.set('preset', preset);
      const data = await staffGet<{
        count: number;
        results: ConsoleWalletRow[];
        preset?: string;
      }>(`/integrity/console/wallets/?${params}`);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load wallets';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPresets = useCallback(async () => {
    const data = await api.get<{ presets: AllocationPreset[]; defaultPreset: string }>(
      '/integrity/policies/'
    );
    return data;
  }, []);

  const downloadExport = useCallback(async (preset: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('Staff authentication required');
    const params = new URLSearchParams({ output: 'csv', preset });
    const res = await fetch(`/api/v1/integrity/export/?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integrity-export-${preset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { loading, error, loadOverview, loadWallets, loadPresets, downloadExport };
}
