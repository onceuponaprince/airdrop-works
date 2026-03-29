'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';

interface Metrics {
  timestamp: string;
  backendHealth: { ok: boolean; status: number; latencyMs: number } | null;
  judgeLatency: { ok: boolean; status: number; latencyMs: number } | null;
  waitlistCount: number;
  queueDepth: number | null;
  cacheHitRate: number | null;
}

export default function ObservabilityPage() {
  const metrics = useQuery<Metrics>({
    queryKey: ['observability', 'metrics'],
    queryFn: async () => {
      const res = await fetch('/api/observability/metrics', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load metrics');
      return res.json();
    },
    refetchInterval: 15000,
  });

  return (
    <motion.main className="flex-1 space-y-8 overflow-y-auto p-6" initial="initial" animate="animate" variants={staggerContainer}>
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Observability</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">Live ops snapshot for backend health and judge latency</p>
      </motion.div>

      <motion.section variants={staggerItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Backend Health</p>
          <p className="mt-2 text-xl font-bold text-[--primary]">{metrics.data?.backendHealth?.ok ? 'UP' : 'DOWN'}</p>
          <p className="text-xs text-[--muted-foreground]">{metrics.data?.backendHealth?.latencyMs ?? '-'} ms</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Judge Probe</p>
          <p className="mt-2 text-xl font-bold text-[--primary]">{metrics.data?.judgeLatency?.status ?? '-'}</p>
          <p className="text-xs text-[--muted-foreground]">{metrics.data?.judgeLatency?.latencyMs ?? '-'} ms</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Waitlist Count</p>
          <p className="mt-2 text-xl font-bold text-[--primary]">{metrics.data?.waitlistCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[--border] bg-[--card] p-4">
          <p className="text-xs text-[--muted-foreground]">Last Updated</p>
          <p className="mt-2 text-sm font-mono text-[--primary]">{metrics.data?.timestamp ? new Date(metrics.data.timestamp).toLocaleTimeString() : '-'}</p>
        </div>
      </motion.section>
    </motion.main>
  );
}
