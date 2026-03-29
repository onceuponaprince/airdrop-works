'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { staggerContainer, staggerItem } from '@/lib/animations';

interface ReferralLeaderboardRow {
  referral_code: string;
  referral_count: number;
}

interface WaitlistStats {
  total_signups: number;
  via_referral: number;
  wallet_connected: number;
}

export default function ReferralsPage() {
  const leaderboard = useQuery({
    queryKey: ['referrals', 'leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist_referral_counts')
        .select('referral_code, referral_count')
        .order('referral_count', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data ?? []) as ReferralLeaderboardRow[];
    },
  });

  const stats = useQuery({
    queryKey: ['referrals', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist_stats')
        .select('total_signups, via_referral, wallet_connected')
        .single();
      if (error) throw new Error(error.message);
      return data as WaitlistStats;
    },
  });

  return (
    <motion.main className="flex-1 space-y-8 overflow-y-auto p-6" initial="initial" animate="animate" variants={staggerContainer}>
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Referral Leaderboard</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">Track referral performance and waitlist growth</p>
      </motion.div>

      <motion.section variants={staggerItem} className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Total Signups</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{stats.data?.total_signups ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Via Referral</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{stats.data?.via_referral ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Wallet Connected</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{stats.data?.wallet_connected ?? 0}</p>
        </div>
      </motion.section>

      <motion.section variants={staggerItem} className="space-y-2">
        {(leaderboard.data ?? []).map((row, idx) => (
          <div key={row.referral_code} className="rounded-lg border border-[--border] bg-[--card] p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">#{idx + 1} {row.referral_code}</p>
            </div>
            <p className="font-mono text-sm text-[--primary]">{row.referral_count} referrals</p>
          </div>
        ))}
        {leaderboard.isLoading && <p className="text-sm text-[--muted-foreground]">Loading referral leaderboard...</p>}
      </motion.section>
    </motion.main>
  );
}
