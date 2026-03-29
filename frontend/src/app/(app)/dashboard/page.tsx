'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { api } from '@/lib/api';
import type { Contribution, PaginatedResponse } from '@/types/api';

interface ProfileResponse {
  id: string;
  walletAddress: string;
  displayName: string;
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
      return api.get<PaginatedResponse<Contribution>>('/contributions/?page_size=5');
    },
  });

  const p = profile.data;
  const maxBranchXp = useMemo(() => {
    if (!p) return 1;
    return Math.max(p.educatorXp, p.builderXp, p.creatorXp, p.scoutXp, p.diplomatXp, 1);
  }, [p]);

  const stats = [
    { label: 'Total XP', value: p ? p.totalXp.toLocaleString() : '—', unit: 'XP' },
    { label: 'Current Rank', value: p?.rank ? `#${p.rank}` : '—', unit: '' },
    { label: 'Contributions', value: contributions.data ? contributions.data.count.toLocaleString() : '—', unit: '' },
    { label: 'Primary Branch', value: p?.primaryBranch ? p.primaryBranch.charAt(0).toUpperCase() + p.primaryBranch.slice(1) : '—', unit: '' },
  ];

  return (
    <motion.main
      className="flex-1 space-y-8 overflow-y-auto p-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">
          Character Sheet
        </h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">
          Your profile, skills, and progress
        </p>
      </motion.div>

      <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={staggerItem}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[--border] bg-[--card] p-4"
          >
            <p className="text-[--muted-foreground] text-xs font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-[--primary] mt-2">
              {profile.isLoading ? '...' : stat.value} {stat.unit}
            </p>
          </div>
        ))}
      </motion.div>

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

      <motion.section className="space-y-4" variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading">Recent Contributions</h2>
        {contributions.isLoading ? (
          <div className="rounded-lg border border-[--border] bg-[--card] p-6">
            <p className="text-[--muted-foreground] text-sm">Loading contributions...</p>
          </div>
        ) : (contributions.data?.results?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-center">
            <p className="text-[--muted-foreground] text-sm">
              No contributions yet. Submit your first score to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {contributions.data!.results.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-[--border] bg-[--card] p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{c.contentText}</p>
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
    </motion.main>
  );
}
