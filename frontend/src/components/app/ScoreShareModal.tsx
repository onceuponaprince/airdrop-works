'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Twitter, RefreshCw } from 'lucide-react';
import { ScoreCard } from '@/components/app/ScoreCard';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { buildTwitterShareUrl, buildAccountTwitterShareUrl } from '@/lib/shareScore';
import type { JudgeResult, AccountAnalysis } from '@/types/api';

interface ScoreShareModalProps {
  open: boolean;
  onClose: () => void;
  onScoreAnother?: () => void;
  result?: JudgeResult | null;
  accountResult?: AccountAnalysis | null;
}

export function ScoreShareModal({
  open,
  onClose,
  onScoreAnother,
  result,
  accountResult,
}: ScoreShareModalProps) {
  const shareUrl = result
    ? buildTwitterShareUrl(result)
    : accountResult
      ? buildAccountTwitterShareUrl(accountResult)
      : '';

  const displayResult = result ?? (accountResult
    ? {
        compositeScore: accountResult.aggregate.overallScore,
        teachingValue: accountResult.aggregate.teachingValue,
        originality: accountResult.aggregate.originality,
        communityImpact: accountResult.aggregate.communityImpact,
        farmingFlag: accountResult.aggregate.verdict,
        farmingExplanation: `${accountResult.aggregate.genuinePercentage}% genuine content across ${accountResult.tweetCount} tweets. ${accountResult.aggregate.strengths}`,
        dimensionExplanations: {
          teachingValue: '',
          originality: '',
          communityImpact: '',
        },
        scoredAt: accountResult.analyzedAt,
      } as JudgeResult
    : null);

  return (
    <AnimatePresence>
      {open && displayResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-[--card] border border-[--border] text-[--muted-foreground] hover:text-[--foreground] transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="bg-[--card] rounded-lg border border-[--border] p-6 space-y-6">
              {accountResult && (
                <div className="text-center mb-2">
                  <p className="font-mono text-xs uppercase tracking-widest text-[--muted-foreground]">
                    Account Analysis
                  </p>
                  <p className="font-heading text-lg font-bold text-[--foreground]">
                    @{accountResult.username}
                  </p>
                </div>
              )}

              <div className="flex justify-center">
                <ScoreCard result={displayResult} />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <ArcadeButton
                  variant="primary"
                  className="flex-1"
                  icon={<Twitter size={16} />}
                  onClick={() => window.open(shareUrl, '_blank', 'noopener')}
                >
                  Share on X
                </ArcadeButton>
                {onScoreAnother && (
                  <ArcadeButton
                    variant="secondary"
                    className="flex-1"
                    icon={<RefreshCw size={16} />}
                    onClick={() => {
                      onClose();
                      onScoreAnother();
                    }}
                  >
                    Score Another
                  </ArcadeButton>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
