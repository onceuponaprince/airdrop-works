'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RarityBadge } from '@/components/themed/RarityBadge';

interface LootChestProps {
  id: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  reward?: {
    type: 'xp' | 'token' | 'nft';
    amount: number;
    asset?: string;
  };
  opened?: boolean;
  onOpen?: () => void;
}

export function LootChest({
  id,
  rarity,
  reward,
  opened = false,
  onOpen,
}: LootChestProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [isOpen, setIsOpen] = useState(opened);

  const handleOpen = async () => {
    setIsOpening(true);
    // HANDOVER: UI delay is for animation only.
    // Replace with optimistic mutation once /rewards/loot/{id}/open is wired.
    await new Promise((r) => setTimeout(r, 500)); // Animation duration
    setIsOpen(true);
    onOpen?.();
    setIsOpening(false);
  };

  return (
    <motion.div
      data-loot-id={id}
      className="rounded-lg border border-[--border] bg-[--card] p-6 cursor-pointer flex flex-col items-center justify-center h-48 group"
      whileHover={!isOpen ? { scale: 1.05 } : undefined}
      onClick={!isOpen ? handleOpen : undefined}
    >
      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            key="chest"
            className="text-center"
            exit={{ scale: 0, rotate: -180, opacity: 0 }}
          >
            {/* Chest visual */}
            <motion.div
              className="text-5xl mb-3 inline-block"
              animate={isOpening ? { rotate: [0, -10, 10, 0] } : undefined}
              transition={{ duration: 0.6 }}
            >
              📦
            </motion.div>

            {/* Rarity badge */}
            <div className="mb-3">
              <RarityBadge tier={rarity} />
            </div>

            {/* Click prompt */}
            <p className="text-xs text-[--muted-foreground] group-hover:text-[--primary] transition-colors">
              Click to open
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="reward"
            className="text-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Reward celebration */}
            <motion.div
              className="text-4xl mb-3"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {reward?.type === 'xp' && '⚡'}
              {reward?.type === 'token' && '💎'}
              {reward?.type === 'nft' && '🎁'}
            </motion.div>

            {/* Reward text */}
            <p className="font-bold text-[--primary] text-lg">
              {reward?.amount} {reward?.type === 'xp' ? 'XP' : reward?.asset}
            </p>

            <p className="text-xs text-[--muted-foreground] mt-2">Claimed!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
