'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { SkillTree } from '../../../components/app/SkillTree';
import { api } from '@/lib/api';
import type { Branch } from '@/lib/constants';
import { useNotificationStore } from '@/stores/useNotificationStore';

interface SkillTreeStateResponse {
  skillTreeState: Record<string, string>;
}

const BRANCHES: Branch[] = ['educator', 'builder', 'creator', 'scout', 'diplomat'];

export default function SkillTreePage() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>('educator');
  const queryClient = useQueryClient();
  const notify = useNotificationStore((s) => s.push);

  const skillTree = useQuery({
    queryKey: ['skill-tree'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return { skillTreeState: {} } as SkillTreeStateResponse;
      api.setToken(token);
      return api.get<SkillTreeStateResponse>('/profiles/me/skill-tree/');
    },
  });

  const unlock = useMutation({
    mutationFn: async (nodeId: string) => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Connect wallet and authenticate before unlocking nodes.');
      api.setToken(token);
      return api.post<SkillTreeStateResponse>(`/profiles/me/skill-tree/unlock/${nodeId}/`);
    },
    onSuccess: () => {
      notify({
        type: 'success',
        title: 'Node unlocked',
        message: 'Your skill tree progression has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['skill-tree'] });
    },
    onError: (err) => {
      notify({
        type: 'warning',
        title: 'Unlock blocked',
        message: err instanceof Error ? err.message : 'Unable to unlock this node yet.',
      });
    },
  });

  const profileQuery = useQuery({
    queryKey: ['profile-xp'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return { totalXp: 0 };
      api.setToken(token);
      return api.get<{ totalXp: number }>('/profiles/me/');
    },
  });
  const profileXp = profileQuery.data?.totalXp ?? 0;

  const unlockedNodes = Object.keys(skillTree.data?.skillTreeState ?? {});

  return (
    <motion.main className="flex-1 space-y-8 overflow-y-auto p-6" initial="initial" animate="animate" variants={staggerContainer}>
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Skill Tree</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">Unlock skills and abilities across 5 branches</p>
      </motion.div>

      <motion.div className="flex gap-2 flex-wrap" variants={staggerItem}>
        {BRANCHES.map((branch) => (
          <button
            key={branch}
            onClick={() => setSelectedBranch(branch)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${selectedBranch === branch ? 'border-[--primary] text-[--primary] bg-[--primary]/10' : 'border-[--border] hover:border-[--primary] hover:text-[--primary]'}`}
          >
            {branch.charAt(0).toUpperCase() + branch.slice(1)}
          </button>
        ))}
      </motion.div>

      <motion.div variants={staggerItem}>
        <div className="rounded-lg border border-[--border] bg-[--card] p-6">
          <SkillTree
            branch={selectedBranch}
            unlockedNodes={unlockedNodes}
            currentXp={profileXp}
            isUnlocking={unlock.isPending}
            onUnlock={(nodeId: string) => unlock.mutate(nodeId)}
          />
        </div>
      </motion.div>
    </motion.main>
  );
}
