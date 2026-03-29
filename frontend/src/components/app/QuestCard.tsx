'use client';

import { motion } from 'framer-motion';
import { DifficultyBadge } from '@/components/themed/DifficultyBadge';
import { ChevronRight } from 'lucide-react';

interface QuestCardProps {
  id: string;
  title: string;
  description: string;
  difficulty: 'D' | 'C' | 'B' | 'A' | 'S';
  rewardXp: number;
  rewardToken?: string;
  rewardAmountUsd?: number;
  participants?: number;
  maxParticipants?: number;
  status: 'available' | 'in_progress' | 'completed';
  onAccept?: () => void;
}

export function QuestCard({
  id,
  title,
  description,
  difficulty,
  rewardXp,
  rewardToken,
  rewardAmountUsd,
  participants = 0,
  maxParticipants = 100,
  status,
  onAccept,
}: QuestCardProps) {
  const isFull = Boolean(maxParticipants && participants >= maxParticipants);

  return (
    <motion.div
      data-quest-id={id}
      className="rounded-lg border border-[--border] bg-[--card] p-6 hover:border-[--primary] transition-colors group"
      whileHover={{ scale: 1.02 }}
    >
      {/* HANDOVER: this component is presentational; state transitions happen in parent query/mutation hooks. */}
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="font-heading font-bold text-lg flex-1">{title}</h3>
        <DifficultyBadge rating={difficulty} />
      </div>

      {/* Description */}
      <p className="text-sm text-[--muted-foreground] mb-4 line-clamp-2">
        {description}
      </p>

      {/* Rewards */}
      <div className="space-y-2 mb-4 pb-4 border-b border-[--border]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[--muted-foreground]">Reward:</span>
          <span className="font-bold text-[--primary]">{rewardXp} XP</span>
          {rewardAmountUsd && (
            <span className="text-xs text-[--muted-foreground]">
              (~${rewardAmountUsd})
            </span>
          )}
        </div>
        {rewardToken && (
          <div className="text-xs text-[--muted-foreground]">{rewardToken}</div>
        )}
      </div>

      {/* Participants */}
      {maxParticipants && (
        <div className="text-xs text-[--muted-foreground] mb-4">
          {participants} / {maxParticipants} participants {isFull && '(FULL)'}
        </div>
      )}

      {/* Action */}
      <button
        onClick={onAccept}
        disabled={status === 'completed' || isFull}
        className="w-full px-4 py-2 rounded border border-[--border] text-sm font-medium hover:bg-[--primary] hover:text-[--primary-foreground] hover:border-[--primary] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {status === 'completed' && 'Completed'}
        {status === 'in_progress' && 'In Progress'}
        {status === 'available' && (
          <>
            Accept <ChevronRight size={16} />
          </>
        )}
      </button>
    </motion.div>
  );
}
