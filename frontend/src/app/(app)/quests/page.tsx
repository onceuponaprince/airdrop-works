'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { QuestCard } from '@/components/app/QuestCard';
import { api } from '@/lib/api';
import type { Quest } from '@/types/api';
import { useNotificationStore } from '@/stores/useNotificationStore';

type QuestDifficultyFilter = 'ALL' | 'D' | 'C' | 'B' | 'A' | 'S';

export default function QuestsPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore((s) => s.push);
  const [difficultyFilter, setDifficultyFilter] = useState<QuestDifficultyFilter>('ALL');
  const [inProgressIds, setInProgressIds] = useState<Record<string, boolean>>({});

  const quests = useQuery({
    queryKey: ['quests', difficultyFilter],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (token) api.setToken(token);
      const qs = difficultyFilter === 'ALL' ? '' : `?difficulty=${difficultyFilter}`;
      return api.get<Quest[]>(`/quests/${qs}`);
    },
  });

  const acceptQuest = useMutation({
    mutationFn: async (questId: string) => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Connect wallet and authenticate before accepting quests.');
      api.setToken(token);
      return api.post(`/quests/${questId}/accept/`);
    },
    onMutate: (questId) => {
      setInProgressIds((prev) => ({ ...prev, [questId]: true }));
    },
    onSuccess: (_, questId) => {
      notify({
        type: 'success',
        title: 'Quest accepted',
        message: 'Quest moved to your active quest list.',
      });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      setInProgressIds((prev) => ({ ...prev, [questId]: false }));
    },
    onError: (err, questId) => {
      notify({
        type: 'error',
        title: 'Quest accept failed',
        message: err instanceof Error ? err.message : 'Unable to accept quest.',
      });
      setInProgressIds((prev) => ({ ...prev, [questId]: false }));
    },
  });

  const questList = useMemo(() => quests.data ?? [], [quests.data]);

  return (
    <motion.main className="flex-1 space-y-8 overflow-y-auto p-6" initial="initial" animate="animate" variants={staggerContainer}>
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Quest Board</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">Accept quests to earn XP and unlock loot</p>
      </motion.div>

      <motion.div className="flex gap-2 flex-wrap" variants={staggerItem}>
        {(['ALL', 'D', 'C', 'B', 'A', 'S'] as QuestDifficultyFilter[]).map((value) => (
          <button
            key={value}
            onClick={() => setDifficultyFilter(value)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${difficultyFilter === value ? 'border-[--primary] text-[--primary] bg-[--primary]/10' : 'border-[--border] hover:bg-[--secondary]'}`}
          >
            {value === 'ALL' ? 'All' : value}
          </button>
        ))}
      </motion.div>

      <motion.div variants={staggerItem}>
        {quests.isLoading ? (
          <p className="text-sm text-[--muted-foreground]">Loading quests...</p>
        ) : questList.length === 0 ? (
          <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-sm text-[--muted-foreground]">No quests available for this filter.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {questList.map((quest) => {
              const status: 'available' | 'in_progress' = inProgressIds[quest.id] ? 'in_progress' : 'available';
              return (
                <QuestCard
                  key={quest.id}
                  id={quest.id}
                  title={quest.title}
                  description={quest.description}
                  difficulty={quest.difficulty}
                  rewardXp={Number(quest.rewardPool) || 0}
                  rewardToken={quest.rewardToken}
                  participants={quest.participantCount}
                  maxParticipants={quest.maxParticipants}
                  status={status}
                  onAccept={() => acceptQuest.mutate(quest.id)}
                />
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.main>
  );
}
