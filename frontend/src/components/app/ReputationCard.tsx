'use client';

import { motion } from 'framer-motion';
import { Shield, TrendingUp, Users, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReputationBundle, FarmingFlag } from '@/hooks/useReputation';

interface ReputationCardProps {
  bundle: ReputationBundle | null;
  isLoading?: boolean;
  className?: string;
}

const farmingFlagConfig: Record<FarmingFlag, { label: string; color: string; icon: typeof Shield }> = {
  genuine: { label: 'Genuine Contributor', color: 'text-emerald-400', icon: Shield },
  farming: { label: 'Review Flagged', color: 'text-rose-400', icon: Shield },
  ambiguous: { label: 'Under Review', color: 'text-amber-400', icon: Shield },
};

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[--muted-foreground]">{label}</span>
        <span className="font-mono text-[--foreground]">{pct}</span>
      </div>
      <div className="h-2 rounded bg-[--secondary] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'h-full rounded',
            pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-[--primary]' : 'bg-amber-500'
          )}
        />
      </div>
    </div>
  );
}

export function ReputationCard({ bundle, isLoading, className }: ReputationCardProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-[--border] bg-[--card] p-6 animate-pulse', className)}>
        <div className="h-6 w-40 bg-[--secondary] rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-[--secondary] rounded" />
          <div className="h-4 w-3/4 bg-[--secondary] rounded" />
        </div>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className={cn('rounded-lg border border-[--border] bg-[--card] p-6', className)}>
        <h3 className="font-display text-lg text-[--primary] mb-2">Reputation</h3>
        <p className="text-sm text-[--muted-foreground]">
          Complete quests and get contributions scored to build your reputation.
        </p>
      </div>
    );
  }

  const flagConfig = farmingFlagConfig[bundle.farmingFlag] ?? farmingFlagConfig.ambiguous;
  const FlagIcon = flagConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-lg border border-[--border] bg-[--card] p-6', className)}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-lg text-[--primary]">Reputation</h3>
          <p className="text-xs text-[--muted-foreground] mt-1">
            Last scored: {bundle.scoredAt ? new Date(bundle.scoredAt).toLocaleDateString() : 'Never'}
          </p>
        </div>
        <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full border', flagConfig.color)}>
          <FlagIcon size={14} />
          <span className="text-xs font-medium">{flagConfig.label}</span>
        </div>
      </div>

      {/* Composite Score */}
      <div className="mb-6 p-4 rounded-lg bg-[--secondary]/50">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={20} className="text-[--primary]" />
          <span className="text-sm text-[--muted-foreground]">Composite Score</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl text-[--foreground]">{bundle.compositeScore}</span>
          <span className="text-sm text-[--muted-foreground]">/ 100</span>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="space-y-3 mb-6">
        <ScoreBar label="Teaching Value" value={bundle.teachingValue} />
        <ScoreBar label="Originality" value={bundle.originality} />
        <ScoreBar label="Community Impact" value={bundle.communityImpact} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border border-[--border]">
          <div className="flex items-center gap-2 text-[--muted-foreground] mb-1">
            <Users size={14} />
            <span className="text-xs">Contributions</span>
          </div>
          <span className="font-mono text-lg text-[--foreground]">{bundle.contributionCount}</span>
        </div>
        <div className="p-3 rounded-lg border border-[--border]">
          <div className="flex items-center gap-2 text-[--muted-foreground] mb-1">
            <Award size={14} />
            <span className="text-xs">Farming Rate</span>
          </div>
          <span
            className={cn(
              'font-mono text-lg',
              bundle.farmingPercentage > 50 ? 'text-rose-400' : 'text-[--foreground]'
            )}
          >
            {bundle.farmingPercentage}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
