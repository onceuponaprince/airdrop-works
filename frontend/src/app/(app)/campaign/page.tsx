'use client';

import { motion } from 'framer-motion';
import { Trophy, Users, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { CampaignLeaderboard } from '@/components/app/CampaignLeaderboard';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';

export default function CampaignPage() {
  const { accounts } = useSocialAccounts();
  const hasConnections = (accounts.data?.length ?? 0) > 0;

  return (
    <motion.main
      className="flex-1 space-y-10 overflow-y-auto p-6 max-w-5xl mx-auto"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Hero */}
      <motion.div variants={staggerItem} className="text-center pt-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[--primary]/40 bg-[--primary]/5 px-4 py-1 text-sm mb-4">
          <Trophy className="text-[--primary]" size={16} />
          <span className="font-display text-[--primary]">LIVE MULTI-PLATFORM CAMPAIGN</span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl text-[--primary] tracking-tight">
          Contribute anywhere.<br />Get scored. Climb the ranks.
        </h1>
        <p className="mt-4 text-lg text-[--muted-foreground] max-w-2xl mx-auto">
          Connect your Telegram, Discord, and Twitter accounts. Every high-quality post and message you make is scored by the AI Judge and converted into XP across the 5 contribution branches.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={hasConnections ? "/dashboard" : "/sources"}>
            <ArcadeButton size="lg" icon={<ArrowRight size={18} />}>
              {hasConnections ? "Go to Dashboard" : "Connect Your Accounts"}
            </ArcadeButton>
          </Link>
          <Link href="/leaderboard">
            <ArcadeButton size="lg" variant="secondary">
              View Full Leaderboards
            </ArcadeButton>
          </Link>
        </div>
      </motion.div>

      {/* How it works */}
      <motion.section variants={staggerItem} className="grid gap-6 sm:grid-cols-3">
        {[
          { icon: <Users size={22} />, title: "Connect", desc: "Link your Telegram, Discord, and Twitter accounts in one click." },
          { icon: <Zap size={22} />, title: "Contribute", desc: "Post, chat, and engage naturally. High-quality activity gets scored." },
          { icon: <Trophy size={22} />, title: "Climb", desc: "Earn XP across Educator, Builder, Creator, Scout, and Diplomat branches." },
        ].map((step, i) => (
          <div key={i} className="rounded-xl border border-[--border] bg-[--card] p-6">
            <div className="text-[--primary] mb-3">{step.icon}</div>
            <div className="font-display text-xl text-[--primary]">{step.title}</div>
            <p className="mt-2 text-[--muted-foreground] text-sm">{step.desc}</p>
          </div>
        ))}
      </motion.section>

      {/* Live Leaderboard */}
      <motion.section variants={staggerItem}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl text-[--primary]">Live Campaign Leaderboard</h2>
            <p className="text-sm text-[--muted-foreground]">Top contributors across all connected platforms (last 7 days activity weighted)</p>
          </div>
          <Link href="/leaderboard?scope=multi-platform">
            <ArcadeButton size="sm" variant="secondary">Full Rankings →</ArcadeButton>
          </Link>
        </div>

        <CampaignLeaderboard />
      </motion.section>

      {/* CTA */}
      <motion.div variants={staggerItem} className="text-center py-8 border-t border-[--border]">
        <p className="text-[--muted-foreground] mb-4">Ready to start earning real contribution reputation?</p>
        <Link href="/dashboard">
          <ArcadeButton size="lg">Open Dashboard & Connect Accounts</ArcadeButton>
        </Link>
      </motion.div>
    </motion.main>
  );
}