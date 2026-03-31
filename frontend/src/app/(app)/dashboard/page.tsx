'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { CreditCard, History, Settings, TrendingUp, ExternalLink } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { api } from '@/lib/api';
import { useCredits } from '@/hooks/useCredits';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { ArcadeCard } from '@/components/themed/ArcadeCard';
import { truncateAddress } from '@/lib/utils';
import type { Contribution, PaginatedResponse } from '@/types/api';

interface ProfileResponse {
  id: string;
  walletAddress: string;
  displayName: string;
  email?: string;
  totalXp: number;
  educatorXp: number;
  builderXp: number;
  creatorXp: number;
  scoutXp: number;
  diplomatXp: number;
  skillTreeState: Record<string, string>;
  rank: number | null;
  primaryBranch: string;
  createdAt: string;
}

const BRANCHES = [
  { key: 'educator', field: 'educatorXp' as const },
  { key: 'builder', field: 'builderXp' as const },
  { key: 'creator', field: 'creatorXp' as const },
  { key: 'scout', field: 'scoutXp' as const },
  { key: 'diplomat', field: 'diplomatXp' as const },
];

export default function DashboardPage() {
  const profile = useQuery({
    queryKey: ['dashboard', 'profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;
      api.setToken(token);
      return api.get<ProfileResponse>('/profiles/me/');
    },
  });

  const contributions = useQuery({
    queryKey: ['dashboard', 'contributions'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return { count: 0, results: [], next: null, previous: null };
      api.setToken(token);
      return api.get<PaginatedResponse<Contribution>>('/contributions/?page_size=10');
    },
  });

  const { credits, plan, loading: creditsLoading, creditsRemaining, monthlyCredits } = useCredits();

  const p = profile.data;
  const maxBranchXp = useMemo(() => {
    if (!p) return 1;
    return Math.max(p.educatorXp, p.builderXp, p.creatorXp, p.scoutXp, p.diplomatXp, 1);
  }, [p]);

  const handleManageBilling = async () => {
    try {
      const res = await api.post<{ url: string }>('/payments/user-portal/');
      window.location.assign(res.url);
    } catch {
      // Stripe portal not configured — silently fail
    }
  };

  return (
    <motion.main
      className="flex-1 space-y-8 overflow-y-auto p-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Dashboard</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">
          Your usage, history, and account at a glance.
        </p>
      </motion.div>

      {/* ── Usage & Subscription ────────────────────────────────── */}
      <motion.section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={staggerItem}>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-[--muted-foreground] text-xs font-medium">Credits Remaining</p>
          <p className="text-2xl font-bold text-[--primary] mt-2">
            {creditsLoading ? '...' : credits}
          </p>
          {!creditsLoading && monthlyCredits > 0 && (
            <p className="text-xs text-[--muted-foreground] mt-1">of {monthlyCredits} / month</p>
          )}
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-[--muted-foreground] text-xs font-medium">Current Plan</p>
          <p className="text-2xl font-bold text-[--primary] mt-2 capitalize">
            {creditsLoading ? '...' : plan}
          </p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-[--muted-foreground] text-xs font-medium">Total XP</p>
          <p className="text-2xl font-bold text-[--primary] mt-2">
            {profile.isLoading ? '...' : (p?.totalXp.toLocaleString() ?? '0')}
          </p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-[--muted-foreground] text-xs font-medium">Rank</p>
          <p className="text-2xl font-bold text-[--primary] mt-2">
            {profile.isLoading ? '...' : (p?.rank ? `#${p.rank}` : '—')}
          </p>
        </div>
      </motion.section>

      {/* ── Account Details ────────────────────────────────── */}
      <motion.section variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading mb-4 flex items-center gap-2">
          <Settings size={18} className="text-[--primary]" />
          Account Details
        </h2>
        <ArcadeCard>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[--muted-foreground] font-mono uppercase tracking-widest mb-1">Wallet</p>
              <p className="text-sm font-mono text-[--foreground]">
                {profile.isLoading ? '...' : truncateAddress(p?.walletAddress ?? '')}
              </p>
            </div>
            <div>
              <p className="text-xs text-[--muted-foreground] font-mono uppercase tracking-widest mb-1">Display Name</p>
              <p className="text-sm text-[--foreground]">
                {profile.isLoading ? '...' : (p?.displayName || '—')}
              </p>
            </div>
            <div>
              <p className="text-xs text-[--muted-foreground] font-mono uppercase tracking-widest mb-1">Member Since</p>
              <p className="text-sm text-[--foreground]">
                {profile.isLoading ? '...' : (p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—')}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[--border]">
            <Link href="/settings">
              <ArcadeButton size="sm" variant="secondary">
                Edit Account Settings
              </ArcadeButton>
            </Link>
          </div>
        </ArcadeCard>
      </motion.section>

      {/* ── Subscription Management ────────────────────────── */}
      <motion.section variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-[--primary]" />
          Subscription
        </h2>
        <ArcadeCard>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-[--foreground]">
                You&apos;re on the <span className="font-bold text-[--primary] capitalize">{creditsLoading ? '...' : plan}</span> plan
              </p>
              <p className="text-xs text-[--muted-foreground] mt-1">
                {creditsLoading ? '' : `${creditsRemaining ?? credits} credits remaining this period`}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/pricing">
                <ArcadeButton size="sm" variant="secondary" icon={<TrendingUp size={14} />}>
                  Upgrade
                </ArcadeButton>
              </Link>
              <ArcadeButton
                size="sm"
                variant="secondary"
                onClick={handleManageBilling}
                icon={<ExternalLink size={14} />}
              >
                Manage Billing
              </ArcadeButton>
            </div>
          </div>
        </ArcadeCard>
      </motion.section>

      {/* ── Search / Scoring History ────────────────────────── */}
      <motion.section variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading mb-4 flex items-center gap-2">
          <History size={18} className="text-[--primary]" />
          Scoring History
        </h2>
        {contributions.isLoading ? (
          <ArcadeCard>
            <p className="text-[--muted-foreground] text-sm">Loading history...</p>
          </ArcadeCard>
        ) : (contributions.data?.results?.length ?? 0) === 0 ? (
          <ArcadeCard className="text-center py-8">
            <p className="text-[--muted-foreground] text-sm mb-3">
              No scores yet. Head to the AI Judge to get started!
            </p>
            <Link href="/judge">
              <ArcadeButton size="sm">Score Something</ArcadeButton>
            </Link>
          </ArcadeCard>
        ) : (
          <div className="space-y-2">
            {contributions.data!.results.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-[--border] bg-[--card] p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-[--foreground]">{c.contentText}</p>
                  <p className="text-xs text-[--muted-foreground] mt-1">
                    {c.platform} · {c.scoredAt ? new Date(c.scoredAt).toLocaleDateString() : 'pending'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-[--primary]">
                    {c.totalScore ?? '—'}
                  </p>
                  <p className="text-xs text-[--muted-foreground]">
                    +{c.xpAwarded} XP
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Branch Progress ────────────────────────────────── */}
      <motion.section className="space-y-4" variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading">Branch Progress</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BRANCHES.map(({ key, field }) => {
            const xp = p ? p[field] : 0;
            const pct = maxBranchXp > 0 ? Math.round((xp / maxBranchXp) * 100) : 0;
            return (
              <div
                key={key}
                className="rounded-lg border border-[--border] bg-[--card] p-4 text-center"
              >
                <p className="capitalize font-medium text-sm">{key}</p>
                <p className="text-2xl font-bold text-[--primary] mt-2">
                  {profile.isLoading ? '...' : `${xp.toLocaleString()} XP`}
                </p>
                <div className="mt-3 h-2 bg-[--secondary] rounded">
                  <div
                    className="h-full bg-[--primary] rounded transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.section>
    </motion.main>
  );
}
