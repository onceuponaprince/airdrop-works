'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RubricForm } from '@/components/admin/RubricForm';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { ApiError, api } from '@/lib/api';

interface AdminOverview {
  users: number;
  contributions: number;
  scoredContributions: number;
  unscoredContributions: number;
  activeCrawlSources: number;
  farmingContributions: number;
  totalXpAwarded: number;
  averageContributionScore: number;
  trackedPlatforms: number;
}

export default function AdminPage() {
  const router = useRouter();

  const overview = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Please login first.');
      api.setToken(token);
      return api.get<AdminOverview>('/core/admin/overview/');
    },
    retry: false,
  });

  useEffect(() => {
    if (!overview.isError) return;

    const error = overview.error;
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      router.replace('/dashboard');
    }
  }, [overview.isError, overview.error, router]);

  if (overview.isLoading) {
    return (
      <main className="flex-1 p-6 text-sm text-[--muted-foreground]">Checking admin access...</main>
    );
  }

  return (
    <motion.main className="flex-1 space-y-8 overflow-y-auto p-6" initial="initial" animate="animate" variants={staggerContainer}>
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Admin View</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">Operational overview for administrators</p>
      </motion.div>

      {overview.isError ? (
        <motion.div variants={staggerItem} className="rounded-lg border border-[--destructive] bg-[--card] p-6 text-sm text-[--destructive]">
          {overview.error instanceof Error ? overview.error.message : 'Unable to load admin data.'}
        </motion.div>
      ) : null}

      <motion.section variants={staggerItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Users</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.users ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Contributions</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.contributions ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Unscored</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.unscoredContributions ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Active Crawlers</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.activeCrawlSources ?? 0}</p>
        </div>
      </motion.section>

      <motion.section variants={staggerItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Scored</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.scoredContributions ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Farming</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.farmingContributions ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">XP Awarded</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.totalXpAwarded ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Avg Score</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.averageContributionScore ?? 0}</p>
        </div>
      </motion.section>

      <motion.section variants={staggerItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Tracked Platforms</p>
          <p className="mt-2 text-2xl font-bold text-[--primary]">{overview.data?.trackedPlatforms ?? 0}</p>
        </div>
      </motion.section>

      <motion.section variants={staggerItem}>
        <RubricForm />
      </motion.section>
    </motion.main>
  );
}
