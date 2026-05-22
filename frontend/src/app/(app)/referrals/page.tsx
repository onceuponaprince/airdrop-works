'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/useNotificationStore';

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
  const notify = useNotificationStore((s) => s.push);

  const myReferral = useQuery({
    queryKey: ['referrals', 'me'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;
      api.setToken(token);
      return api.get<{ code: string; referrals: number }>('/referrals/me/');
    },
  });

  const leaderboard = useQuery({
    queryKey: ['referrals', 'leaderboard'],
    queryFn: async () => {
      return api.get<{ wallet: string; count: number }[]>('/referrals/leaderboard/');
    },
  });

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/?ref=${code}`);
    notify({ type: 'success', title: 'Link copied', message: 'Share your referral link!' });
  };

  const handleShareX = (code: string) => {
    const text = encodeURIComponent(`Join me on AI(r)Drop — the gamified airdrop scorer. Use my code: ${code}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const personalCode = myReferral.data?.code;
  const personalCount = myReferral.data?.referrals ?? 0;

  return (
    <motion.main className="flex-1 space-y-8 overflow-y-auto p-6" initial="initial" animate="animate" variants={staggerContainer}>
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Referrals</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">Earn XP and rewards by bringing new contributors to the protocol.</p>
      </motion.div>

      {personalCode && (
        <motion.section variants={staggerItem} className="rounded-lg border border-[--primary] bg-[--card] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-[--muted-foreground]">YOUR REFERRAL CODE</p>
              <p className="font-mono text-3xl text-[--primary] tracking-[4px]">{personalCode}</p>
              <p className="text-sm text-[--muted-foreground] mt-1">{personalCount} successful referrals</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleCopy(personalCode)} className="px-4 py-2 rounded bg-[--primary] text-[--primary-foreground] text-sm">Copy Link</button>
              <button onClick={() => handleShareX(personalCode)} className="px-4 py-2 rounded border border-[--border] text-sm">Share on 𝕏</button>
            </div>
          </div>
        </motion.section>
      )}

      <motion.section variants={staggerItem} className="space-y-2">
        <h2 className="font-display text-xl text-[--primary]">Top Referrers</h2>
        {(leaderboard.data ?? []).length === 0 && !leaderboard.isLoading && (
          <p className="text-sm text-[--muted-foreground]">No referrals yet. Be the first!</p>
        )}
        {(leaderboard.data ?? []).map((row, idx) => (
          <div key={row.wallet} className="rounded-lg border border-[--border] bg-[--card] p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">#{idx + 1} {row.wallet.slice(0, 6)}...{row.wallet.slice(-4)}</p>
            </div>
            <p className="font-mono text-sm text-[--primary]">{row.count} referrals</p>
          </div>
        ))}
        {leaderboard.isLoading && <p className="text-sm text-[--muted-foreground]">Loading referral leaderboard...</p>}
      </motion.section>
    </motion.main>
  );
}
