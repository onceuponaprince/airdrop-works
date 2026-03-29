'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { LootChest } from '@/components/app/LootChest';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/useNotificationStore';

type LootType = 'xp' | 'token' | 'nft';

interface LootChestResponse {
  id: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  loot_type: 'badge' | 'innovator_token' | 'multiplier' | null;
  loot_name: string | null;
  loot_amount: number | null;
  opened: boolean;
}

function mapRarity(rarity: LootChestResponse['rarity']): 'common' | 'rare' | 'epic' | 'legendary' {
  return rarity === 'uncommon' ? 'rare' : rarity;
}

function mapLootType(type: LootChestResponse['loot_type']): LootType {
  if (type === 'innovator_token') return 'token';
  if (type === 'badge') return 'nft';
  return 'xp';
}

export default function LootPage() {
  const notify = useNotificationStore((s) => s.push);
  const queryClient = useQueryClient();
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loot = useQuery({
    queryKey: ['loot'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) return [] as LootChestResponse[];
      api.setToken(token);
      return api.get<LootChestResponse[]>('/rewards/loot/');
    },
  });

  const openLoot = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Connect wallet and authenticate before opening loot.');
      api.setToken(token);
      return api.post<LootChestResponse>(`/rewards/loot/${id}/open/`);
    },
    onMutate: (id) => {
      setOpeningId(id);
    },
    onSuccess: (data) => {
      notify({
        type: 'success',
        title: 'Loot opened',
        message: `You received ${data.loot_name ?? 'a reward'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['loot'] });
      setOpeningId(null);
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'Open failed',
        message: err instanceof Error ? err.message : 'Unable to open chest.',
      });
      setOpeningId(null);
    },
  });

  const stats = useMemo(() => {
    const rows = loot.data ?? [];
    const total = rows.length;
    const unopened = rows.filter((c) => !c.opened).length;
    const totalValue = rows.reduce((sum, c) => sum + (c.loot_amount ?? 0), 0);
    return { total, unopened, totalValue };
  }, [loot.data]);

  return (
    <motion.main className="flex-1 space-y-8 overflow-y-auto p-6" initial="initial" animate="animate" variants={staggerContainer}>
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Loot</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">Open your reward chests and claim loot</p>
      </motion.div>

      <motion.div className="grid gap-4 sm:grid-cols-3" variants={staggerItem}>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-[--muted-foreground] text-xs">Total Chests</p>
          <p className="text-2xl font-bold text-[--primary] mt-2">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-[--muted-foreground] text-xs">Unopened</p>
          <p className="text-2xl font-bold text-[--primary] mt-2">{stats.unopened}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-[--muted-foreground] text-xs">Total Value</p>
          <p className="text-2xl font-bold text-[--primary] mt-2">{stats.totalValue} XP</p>
        </div>
      </motion.div>

      <motion.div variants={staggerItem}>
        {loot.isLoading ? (
          <p className="text-sm text-[--muted-foreground]">Loading loot...</p>
        ) : (loot.data ?? []).length === 0 ? (
          <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-sm text-[--muted-foreground]">No loot chests available yet.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(loot.data ?? []).map((chest) => (
              <LootChest
                key={chest.id}
                id={chest.id}
                rarity={mapRarity(chest.rarity)}
                opened={chest.opened}
                reward={
                  chest.opened
                    ? {
                        type: mapLootType(chest.loot_type),
                        amount: chest.loot_amount ?? 0,
                        asset: chest.loot_name ?? undefined,
                      }
                    : undefined
                }
                onOpen={() => {
                  // Anti-replay UX guard: do nothing if already opening/opened.
                  if (chest.opened || openingId === chest.id) return;
                  openLoot.mutate(chest.id);
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.main>
  );
}
