'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appeal, AppealStatus } from '@/hooks/useAppeals';

interface AppealsPanelProps {
  appeals: Appeal[];
  isLoading?: boolean;
  onFileAppeal?: (contributionId: string, reason: string) => Promise<void>;
  className?: string;
}

const statusConfig: Record<AppealStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending Review', color: 'text-amber-400', icon: Clock },
  upheld: { label: 'Upheld — Flag Removed', color: 'text-emerald-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-rose-400', icon: AlertCircle },
};

function AppealCard({ appeal }: { appeal: Appeal }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[appeal.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      layout
      className="rounded-lg border border-[--border] bg-[--card] overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[--secondary]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon size={16} className={config.color} />
          <div>
            <p className="text-sm font-medium text-[--foreground]">
              {appeal.subject === 'contribution' ? 'Contribution Appeal' : 'Account Appeal'}
            </p>
            <p className="text-xs text-[--muted-foreground]">
              Filed {new Date(appeal.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs px-2 py-1 rounded-full border', config.color)}>
            {config.label}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[--border] px-4 pb-4"
          >
            <div className="pt-4 space-y-4">
              {/* Snapshot */}
              <div className="p-3 rounded-lg bg-[--secondary]/30">
                <p className="text-xs text-[--muted-foreground] mb-2">Score at time of appeal</p>
                <div className="flex items-center gap-4">
                  {appeal.snapshotCompositeScore !== null && (
                    <div className="text-sm">
                      <span className="text-[--muted-foreground]">Score:</span>{' '}
                      <span className="font-mono text-[--foreground]">{appeal.snapshotCompositeScore}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-[--muted-foreground]">Flag:</span>{' '}
                    <span
                      className={cn(
                        'capitalize',
                        appeal.snapshotFarmingFlag === 'farming'
                          ? 'text-rose-400'
                          : appeal.snapshotFarmingFlag === 'genuine'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                      )}
                    >
                      {appeal.snapshotFarmingFlag || 'unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Your reason */}
              <div>
                <p className="text-xs text-[--muted-foreground] mb-2">Your explanation</p>
                <p className="text-sm text-[--foreground] whitespace-pre-wrap">{appeal.reason}</p>
              </div>

              {/* Resolution */}
              {appeal.resolutionNote && (
                <div className="p-3 rounded-lg border border-[--primary]/30 bg-[--primary]/5">
                  <p className="text-xs text-[--primary] mb-1">Reviewer response</p>
                  <p className="text-sm text-[--foreground]">{appeal.resolutionNote}</p>
                  {appeal.resolvedAt && (
                    <p className="text-xs text-[--muted-foreground] mt-2">
                      Resolved {new Date(appeal.resolvedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AppealsPanel({ appeals, isLoading, className }: AppealsPanelProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-[--border] bg-[--card] p-6 animate-pulse', className)}>
        <div className="h-6 w-32 bg-[--secondary] rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 w-full bg-[--secondary] rounded" />
          <div className="h-16 w-full bg-[--secondary] rounded" />
        </div>
      </div>
    );
  }

  const pendingCount = appeals.filter((a) => a.status === 'pending').length;
  const resolvedCount = appeals.length - pendingCount;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-[--primary]">Your Appeals</h3>
        {pendingCount > 0 && (
          <span className="text-xs px-2 py-1 rounded-full border border-amber-400/50 text-amber-400">
            {pendingCount} pending
          </span>
        )}
      </div>

      {appeals.length === 0 ? (
        <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-center">
          <Shield size={24} className="mx-auto text-[--muted-foreground] mb-3" />
          <p className="text-sm text-[--muted-foreground]">
            No appeals filed yet. If a contribution is flagged as farming, you can file an appeal
            from the contribution detail view.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appeals.map((appeal) => (
            <AppealCard key={appeal.id} appeal={appeal} />
          ))}
          {resolvedCount > 0 && (
            <p className="text-xs text-[--muted-foreground] text-center">
              {resolvedCount} resolved {resolvedCount === 1 ? 'appeal' : 'appeals'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface AppealFormProps {
  contributionId: string;
  onSubmit: (reason: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function AppealForm({ contributionId, onSubmit, onCancel, isSubmitting }: AppealFormProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 20) {
      setError('Explanation must be at least 20 characters');
      return;
    }

    try {
      await onSubmit(reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit appeal');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-[--muted-foreground] block mb-2">
          Explain why this contribution should not be flagged as farming
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Provide context: your expertise, original insights, community engagement, etc. (minimum 20 characters)"
          rows={4}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-[--border] bg-[--card] px-4 py-3 text-sm text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] resize-none"
        />
        <div className="flex justify-between mt-1">
          <span className={cn('text-xs', reason.length < 20 ? 'text-amber-400' : 'text-emerald-400')}>
            {reason.length} / 20 characters
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-400">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 rounded-lg border border-[--border] text-sm text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--secondary] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || reason.trim().length < 20}
          className="flex-1 px-4 py-2 rounded-lg bg-[--primary] text-[--primary-foreground] text-sm font-medium hover:bg-[--primary]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'File Appeal'}
        </button>
      </div>
    </form>
  );
}
