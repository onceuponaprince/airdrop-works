'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { api } from '@/lib/api';

type LeaderboardScope = 'global' | 'educator' | 'builder' | 'creator' | 'scout' | 'diplomat';

interface LeaderboardRow {
  rank: number;
  walletAddress: string;
  displayName: string;
  avatarUrl: string;
  xp: number;
  contributionCount: number;
  scope: string;
  period: string;
  snapshotAt: string;
}

const SCOPES: { value: LeaderboardScope; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'educator', label: 'Educator' },
  { value: 'builder', label: 'Builder' },
  { value: 'creator', label: 'Creator' },
  { value: 'scout', label: 'Scout' },
  { value: 'diplomat', label: 'Diplomat' },
];

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="h-12 rounded border border-[--border] bg-[--card] animate-pulse"
        />
      ))}
    </div>
  );
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function LeaderboardPage() {
  const [scope, setScope] = useState<LeaderboardScope>('global');

  const leaderboard = useQuery({
    queryKey: ['leaderboard', scope],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (token) api.setToken(token);
      const path = scope === 'global'
        ? '/leaderboard/global/'
        : `/leaderboard/branch/${scope}/`;
      return api.get<LeaderboardRow[]>(path);
    },
  });

  const rows = leaderboard.data ?? [];

  return (
    <motion.main
      className="flex-1 space-y-8 overflow-y-auto p-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">
          Leaderboard
        </h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">
          Top contributors by XP and branch
        </p>
      </motion.div>

      <motion.div className="flex gap-2 flex-wrap" variants={staggerItem}>
        {SCOPES.map((s) => (
          <button
            key={s.value}
            onClick={() => setScope(s.value)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              scope === s.value
                ? 'border-[--primary] bg-[--primary] text-[--primary-foreground]'
                : 'border-[--border] hover:bg-[--secondary]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </motion.div>

      <motion.div variants={staggerItem}>
        {leaderboard.isLoading ? (
          <LeaderboardSkeleton />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-center">
            <p className="text-[--muted-foreground] text-sm">
              No leaderboard data yet. Contribute to get ranked!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[3rem_1fr_6rem_6rem] gap-2 px-4 py-2 text-xs font-medium text-[--muted-foreground] uppercase tracking-wider">
              <span>Rank</span>
              <span>User</span>
              <span className="text-right">XP</span>
              <span className="text-right">Contributions</span>
            </div>
            {rows.map((row) => (
              <motion.div
                key={`${row.rank}-${row.walletAddress}`}
                layout
                className="grid grid-cols-[3rem_1fr_6rem_6rem] gap-2 items-center px-4 py-3 rounded-lg border border-[--border] bg-[--card] hover:border-[--primary]/40 transition-colors"
              >
                <span className={`text-lg font-bold ${row.rank <= 3 ? 'text-[--primary]' : 'text-[--muted-foreground]'}`}>
                  #{row.rank}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {row.displayName || shortAddress(row.walletAddress)}
                  </p>
                  {row.displayName && (
                    <p className="text-xs text-[--muted-foreground] font-mono">
                      {shortAddress(row.walletAddress)}
                    </p>
                  )}
                </div>
                <p className="text-sm font-bold text-[--primary] text-right">
                  {row.xp.toLocaleString()}
                </p>
                <p className="text-sm text-[--muted-foreground] text-right">
                  {row.contributionCount}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.main>
  );
}
