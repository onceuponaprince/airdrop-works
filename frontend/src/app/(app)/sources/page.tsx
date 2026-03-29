'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutationState } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useCrawlSources } from '@/hooks/useCrawlSources';
import { PLATFORMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { CrawlSourceConfig, CrawlSourcePlatform } from '@/types/api';

const PLATFORM_OPTIONS: Array<{
  value: CrawlSourcePlatform;
  label: string;
  placeholder: string;
  helper: string;
}> = [
  {
    value: 'twitter',
    label: PLATFORMS.twitter.label,
    placeholder: '@airdropworks',
    helper: 'Track posts from a public X account by username.',
  },
  {
    value: 'reddit',
    label: PLATFORMS.reddit.label,
    placeholder: 'python',
    helper: 'Monitor new posts from a subreddit via Reddit OAuth.',
  },
  {
    value: 'discord',
    label: PLATFORMS.discord.label,
    placeholder: '123456789012345678',
    helper: 'Use a channel ID your bot can access.',
  },
  {
    value: 'telegram',
    label: PLATFORMS.telegram.label,
    placeholder: '-1001234567890',
    helper: 'Use a chat or channel ID your bot is already in.',
  },
];

export default function SourcesPage() {
  const notify = useNotificationStore((s) => s.push);
  const [platform, setPlatform] = useState<CrawlSourcePlatform>('reddit');
  const [sourceKey, setSourceKey] = useState('');
  const {
    sourcesQuery,
    connectSourceMutation,
    runSourceMutation,
    updateSourceMutation,
    deleteSourceMutation,
  } = useCrawlSources();

  const activeOption =
    PLATFORM_OPTIONS.find((option) => option.value === platform) ?? PLATFORM_OPTIONS[0];
  const sources = useMemo(() => sourcesQuery.data ?? [], [sourcesQuery.data]);

  const pendingRuns = useMutationState<string>({
    filters: { mutationKey: ['run-source'], status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  });

  const stats = useMemo(() => {
    const activeCount = sources.filter((source) => source.isActive).length;
    const errorCount = sources.filter((source) => Boolean(source.lastError)).length;
    const liveCount = sources.filter((source) => getSourceStatus(source) === 'live').length;
    const createdLastRun = sources.reduce(
      (sum, source) => sum + Number(source.metadata.lastCreatedCount ?? 0),
      0
    );
    const fetchedLastRun = sources.reduce(
      (sum, source) => sum + Number(source.metadata.lastFetchedCount ?? 0),
      0
    );

    return {
      total: sources.length,
      active: activeCount,
      live: liveCount,
      errors: errorCount,
      fetchedLastRun,
      createdLastRun,
    };
  }, [sources]);

  const handleAddSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = sourceKey.trim();
    if (!normalized) {
      notify({
        type: 'warning',
        title: 'Source required',
        message: 'Enter a username, subreddit, channel ID, or chat ID before connecting.',
      });
      return;
    }

    try {
      const task = await connectSourceMutation.mutateAsync({ platform, sourceKey: normalized });
      setSourceKey('');
      notify({
        type: 'success',
        title: 'Source queued',
        message: `${activeOption.label} source queued for ingestion. Task ${task.taskId.slice(0, 8)}…`,
      });
    } catch (error) {
      notify({
        type: 'error',
        title: 'Unable to connect source',
        message: error instanceof Error ? error.message : 'The source could not be queued.',
      });
    }
  };

  return (
    <motion.main
      className="flex-1 overflow-y-auto p-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.section variants={staggerItem}>
          <h1 className="font-display text-2xl text-[--primary] sm:text-3xl">Sources</h1>
          <p className="mt-2 max-w-3xl text-sm text-[--muted-foreground]">
            Connect social inputs, watch crawler health, and manually kick ingestion runs without
            dropping into admin tools.
          </p>
        </motion.section>

        <motion.section variants={staggerItem} className="grid gap-4 md:grid-cols-4">
          <StatsCard label="Connected" value={stats.total} hint="Total configured sources" />
          <StatsCard label="Active" value={stats.active} hint="Sources currently polling" />
          <StatsCard label="Live" value={stats.live} hint="Crawled successfully in the last hour" />
          <StatsCard
            label="Last Run"
            value={`${stats.fetchedLastRun}/${stats.createdLastRun}`}
            hint="Fetched / created items across latest runs"
          />
        </motion.section>

        <motion.section
          variants={staggerItem}
          className="rounded-lg border border-[--border] bg-[--card] p-6"
        >
          <div className="mb-4">
            <h2 className="font-heading text-lg font-bold">Connect a source</h2>
            <p className="mt-1 text-sm text-[--muted-foreground]">{activeOption.helper}</p>
          </div>
          <form className="grid gap-4 lg:grid-cols-[180px_1fr_auto]" onSubmit={handleAddSource}>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Platform</span>
              <select
                value={platform}
                onChange={(event) => setPlatform(event.target.value as CrawlSourcePlatform)}
                className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              >
                {PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Source key</span>
              <input
                value={sourceKey}
                onChange={(event) => setSourceKey(event.target.value)}
                placeholder={activeOption.placeholder}
                className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm outline-none ring-0 transition focus:border-[--primary]"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={connectSourceMutation.isPending}
                className="w-full rounded border border-[--primary] bg-[--primary] px-4 py-2 text-sm font-semibold text-[--primary-foreground] disabled:opacity-60 lg:w-auto"
              >
                {connectSourceMutation.isPending ? 'Queueing…' : 'Connect + crawl'}
              </button>
            </div>
          </form>
        </motion.section>

        <motion.section variants={staggerItem} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold">Connected sources</h2>
              <p className="mt-1 text-sm text-[--muted-foreground]">
                Status comes from the latest crawler run metadata stored on each source config.
              </p>
            </div>
            {stats.errors > 0 ? (
              <span className="rounded-full border border-[--destructive] px-3 py-1 text-xs font-semibold text-[--destructive]">
                {stats.errors} source{stats.errors === 1 ? '' : 's'} need attention
              </span>
            ) : null}
          </div>

          {sourcesQuery.isLoading ? (
            <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-sm text-[--muted-foreground]">
              Loading connected sources…
            </div>
          ) : sourcesQuery.isError ? (
            <div className="rounded-lg border border-[--destructive] bg-[--card] p-6 text-sm text-[--destructive]">
              {sourcesQuery.error instanceof Error
                ? sourcesQuery.error.message
                : 'Unable to load crawl source configs.'}
            </div>
          ) : sources.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[--border] bg-[--card] p-8 text-center text-sm text-[--muted-foreground]">
              No connected sources yet. Add your first Twitter, Reddit, Discord, or Telegram input
              above to start feeding the graph.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {sources.map((source) => {
                const status = getSourceStatus(source);
                const statusLabel = SOURCE_STATUS_LABELS[status];
                const runPending = pendingRuns.includes(source.id);
                const togglePending =
                  updateSourceMutation.isPending && updateSourceMutation.variables?.id === source.id;
                const deletePending =
                  deleteSourceMutation.isPending && deleteSourceMutation.variables === source.id;

                return (
                  <article
                    key={source.id}
                    className="rounded-lg border border-[--border] bg-[--card] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[--muted-foreground]">
                            {PLATFORMS[source.platform].label}
                          </span>
                          <StatusBadge status={status}>{statusLabel}</StatusBadge>
                        </div>
                        <h3 className="mt-2 font-heading text-lg font-bold">{source.sourceKey}</h3>
                        <p className="mt-1 text-sm text-[--muted-foreground]">
                          {source.isActive ? 'Polling enabled' : 'Paused'} · cursor{' '}
                          {source.cursor || 'not set'}
                        </p>
                      </div>
                      <div className="text-right text-xs text-[--muted-foreground]">
                        <div>Last crawl: {formatDateTime(source.lastCrawledAt)}</div>
                        <div>Last run: {formatDateTime(toOptionalString(source.metadata.lastRunAt))}</div>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Metric label="Fetched" value={String(source.metadata.lastFetchedCount ?? 0)} />
                      <Metric label="Created" value={String(source.metadata.lastCreatedCount ?? 0)} />
                      <Metric
                        label="Last cursor"
                        value={String(source.metadata.lastCursor ?? source.cursor ?? '—')}
                      />
                    </dl>

                    {source.lastError ? (
                      <div className="mt-4 rounded border border-[--destructive] bg-[--destructive]/10 px-3 py-2 text-sm text-[--destructive]">
                        {source.lastError}
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-[--muted-foreground]">
                        {status === 'idle'
                          ? 'Connected and waiting for the next crawl.'
                          : status === 'live'
                            ? 'Healthy source with a recent successful run.'
                            : status === 'paused'
                              ? 'Source is paused and will not crawl until resumed.'
                              : 'Crawler reported a failure on the latest run.'}
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const task = await runSourceMutation.mutateAsync(source.id);
                            notify({
                              type: 'success',
                              title: 'Crawl queued',
                              message: `${source.sourceKey} queued as task ${task.taskId.slice(0, 8)}…`,
                            });
                          } catch (error) {
                            notify({
                              type: 'error',
                              title: 'Run failed',
                              message:
                                error instanceof Error
                                  ? error.message
                                  : 'Unable to queue the crawl for this source.',
                            });
                          }
                        }}
                        disabled={runPending}
                        className="rounded border border-[--primary] px-3 py-2 text-sm font-semibold text-[--primary] hover:bg-[--primary]/10 disabled:opacity-60"
                      >
                        {runPending ? 'Queueing…' : 'Run now'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateSourceMutation.mutateAsync({
                              id: source.id,
                              isActive: !source.isActive,
                            });
                            notify({
                              type: 'info',
                              title: source.isActive ? 'Source paused' : 'Source resumed',
                              message: `${source.sourceKey} is now ${source.isActive ? 'paused' : 'active'}.`,
                            });
                          } catch (error) {
                            notify({
                              type: 'error',
                              title: 'Update failed',
                              message:
                                error instanceof Error
                                  ? error.message
                                  : 'Unable to update source status.',
                            });
                          }
                        }}
                        disabled={togglePending}
                        className="rounded border border-[--border] px-3 py-2 text-sm font-semibold hover:bg-[--secondary] disabled:opacity-60"
                      >
                        {togglePending ? 'Saving…' : source.isActive ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = window.confirm(
                            `Disconnect ${source.sourceKey}? Future crawls will stop.`
                          );
                          if (!confirmed) {
                            return;
                          }

                          try {
                            await deleteSourceMutation.mutateAsync(source.id);
                            notify({
                              type: 'info',
                              title: 'Source removed',
                              message: `${source.sourceKey} has been disconnected.`,
                            });
                          } catch (error) {
                            notify({
                              type: 'error',
                              title: 'Disconnect failed',
                              message:
                                error instanceof Error
                                  ? error.message
                                  : 'Unable to remove the source.',
                            });
                          }
                        }}
                        disabled={deletePending}
                        className="rounded border border-[--destructive] px-3 py-2 text-sm font-semibold text-[--destructive] hover:bg-[--destructive]/10 disabled:opacity-60"
                      >
                        {deletePending ? 'Disconnecting…' : 'Disconnect'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </motion.main>
  );
}

function StatsCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-[--border] bg-[--card] p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[--muted-foreground]">
        {label}
      </div>
      <div className="mt-3 font-heading text-2xl font-bold">{value}</div>
      <div className="mt-2 text-sm text-[--muted-foreground]">{hint}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[--border] bg-[--background] px-3 py-2">
      <dt className="text-xs uppercase tracking-[0.2em] text-[--muted-foreground]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function StatusBadge({
  status,
  children,
}: {
  status: SourceStatus;
  children: string;
}) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]',
        status === 'live' && 'border-[--primary] text-[--primary]',
        status === 'idle' && 'border-[--border] text-[--muted-foreground]',
        status === 'paused' && 'border-[#F59E0B] text-[#F59E0B]',
        status === 'error' && 'border-[--destructive] text-[--destructive]'
      )}
    >
      {children}
    </span>
  );
}

type SourceStatus = 'live' | 'idle' | 'paused' | 'error';

const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  live: 'Live',
  idle: 'Idle',
  paused: 'Paused',
  error: 'Error',
};

function getSourceStatus(source: CrawlSourceConfig): SourceStatus {
  if (!source.isActive) {
    return 'paused';
  }
  if (source.lastError) {
    return 'error';
  }

  const lastRunValue = toOptionalString(source.metadata.lastRunAt) ?? source.lastCrawledAt;
  if (!lastRunValue) {
    return 'idle';
  }

  const timestamp = new Date(lastRunValue).getTime();
  if (Number.isNaN(timestamp)) {
    return 'idle';
  }

  return Date.now() - timestamp < 60 * 60 * 1000 ? 'live' : 'idle';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString();
}

function toOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
