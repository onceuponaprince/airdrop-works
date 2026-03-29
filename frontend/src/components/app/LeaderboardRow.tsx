'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface LeaderboardRowProps {
  rank: number;
  address: string;
  xp: number;
  branch: 'educator' | 'builder' | 'creator' | 'scout' | 'diplomat';
  avatar?: string;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({
  rank,
  address,
  xp,
  branch,
  avatar: _avatar,
  isCurrentUser,
}: LeaderboardRowProps) {
  const displayAddress = address.slice(0, 6) + '...' + address.slice(-4);

  return (
    <motion.div
      className={clsx(
        'flex items-center gap-4 rounded border p-4 transition-colors',
        isCurrentUser
          ? 'border-[--primary] bg-[--primary]/10'
          : 'border-[--border] hover:border-[--primary]'
      )}
      whileHover={{ scale: 1.01 }}
    >
      {/* Rank */}
      <div className="min-w-fit font-bold text-[--primary] font-display text-lg">
        #{rank}
      </div>

      {/* Address */}
      <div className="flex-1">
        <p className="font-mono text-sm">{displayAddress}</p>
        <p className="text-xs text-[--muted-foreground] capitalize">{branch}</p>
      </div>

      {/* XP */}
      <div className="min-w-fit text-right">
        <p className="font-bold text-[--primary]">{xp.toLocaleString()} XP</p>
      </div>
    </motion.div>
  );
}
