'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';
import { CrtOverlay } from '@/components/themed/CrtOverlay';
import { FARMING_FLAGS, SCORE_DIMENSIONS } from '@/lib/constants';
import type { AccountAnalysis, TweetScore } from '@/types/api';

interface AccountScoreCardProps {
  analysis: AccountAnalysis;
  className?: string;
}

function TweetScoreRow({ tweet, index }: { tweet: TweetScore; index: number }) {
  const flagCfg = FARMING_FLAGS[tweet.farmingFlag];
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 py-2.5 border-b border-[--border] last:border-0"
    >
      <span
        className={cn(
          'shrink-0 mt-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold',
          flagCfg.bgClass, flagCfg.textClass
        )}
      >
        {tweet.compositeScore}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[--foreground] line-clamp-2">{tweet.text}</p>
        <p className="text-[10px] text-[--muted-foreground] mt-0.5">{tweet.oneLiner}</p>
      </div>
    </motion.div>
  );
}

export function AccountScoreCard({ analysis, className }: AccountScoreCardProps) {
  const overallDisplay = useAnimatedCounter(analysis.aggregate.overallScore, { duration: 1200, delay: 200 });
  const genuineDisplay = useAnimatedCounter(analysis.aggregate.genuinePercentage, { delay: 600 });

  const verdictCfg = FARMING_FLAGS[analysis.aggregate.verdict];

  return (
    <div className={cn('w-full max-w-lg', className)}>
      <CrtOverlay glow>
        <div className="rounded-[var(--radius)] border border-[--border] overflow-hidden bg-[linear-gradient(135deg,hsl(233_18%_9%)_0%,hsl(217_33%_17%)_100%)]">
          {/* Header */}
          <div className="p-5 pb-4">
            <div className="flex items-center gap-3 mb-4">
              {analysis.avatarUrl && (
                <img
                  src={analysis.avatarUrl}
                  alt={analysis.username}
                  className="w-10 h-10 rounded-full border border-[--border]"
                />
              )}
              <div>
                <p className="font-heading font-bold text-[--foreground]">
                  {analysis.displayName || analysis.username}
                </p>
                <p className="font-mono text-xs text-[--muted-foreground]">@{analysis.username}</p>
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[--muted-foreground] mb-1">
                  Account Score
                </p>
                <span className="font-display text-4xl text-[--primary] glow-green tabular leading-none">
                  {String(overallDisplay).padStart(2, '0')}
                </span>
                <span className="font-mono text-sm text-[--muted-foreground] ml-1">/100</span>
              </div>
              <div className="ml-auto text-right">
                <p className="font-mono text-[10px] text-[--muted-foreground]">
                  {analysis.tweetCount} tweets analyzed
                </p>
                <span className="font-mono text-lg text-[--primary]">{genuineDisplay}%</span>
                <span className="font-mono text-[10px] text-[--muted-foreground] ml-1">genuine</span>
              </div>
            </div>
          </div>

          {/* Verdict badge */}
          <div className="px-5 pb-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-mono uppercase tracking-widest',
                verdictCfg.bgClass, verdictCfg.textClass, verdictCfg.borderClass
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: verdictCfg.color }} />
              {verdictCfg.label}
            </span>
          </div>

          <div className="h-px bg-[--border] mx-5" />

          {/* Dimension averages */}
          <div className="p-5 space-y-3">
            {SCORE_DIMENSIONS.map((dim) => {
              const value = analysis.aggregate[dim.key as keyof typeof analysis.aggregate] as number;
              return (
                <div key={dim.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono uppercase tracking-widest text-[--muted-foreground]">{dim.label}</span>
                    <span className="font-mono" style={{ color: dim.color }}>{value}</span>
                  </div>
                  <div className="h-2 rounded-sm bg-[--secondary] overflow-hidden">
                    <motion.div
                      className="h-full rounded-sm"
                      style={{ backgroundColor: dim.color }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${value}%` }}
                      transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Strengths / weaknesses */}
          {(analysis.aggregate.strengths || analysis.aggregate.weaknesses) && (
            <div className="px-5 pb-5 space-y-2">
              {analysis.aggregate.strengths && (
                <p className="text-xs text-[--foreground]">
                  <span className="font-mono text-[--primary]">+</span> {analysis.aggregate.strengths}
                </p>
              )}
              {analysis.aggregate.weaknesses && (
                <p className="text-xs text-[--foreground]">
                  <span className="font-mono text-[--destructive]">-</span> {analysis.aggregate.weaknesses}
                </p>
              )}
            </div>
          )}

          {/* Individual tweet scores */}
          {analysis.tweets.length > 0 && (
            <div className="border-t border-[--border]">
              <div className="px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[--muted-foreground]">
                  Individual Tweet Scores
                </p>
              </div>
              <div className="px-5 pb-5 max-h-64 overflow-y-auto">
                {analysis.tweets.map((tweet, i) => (
                  <TweetScoreRow key={tweet.tweetId} tweet={tweet} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </CrtOverlay>
    </div>
  );
}
