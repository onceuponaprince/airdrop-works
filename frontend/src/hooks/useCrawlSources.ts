'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CrawlSourceConfig,
  CrawlSourcePlatform,
  QueuedTaskResponse,
} from '@/types/api';

interface CrawlSourceConfigWire {
  id: string;
  platform: CrawlSourcePlatform;
  source_key: string;
  is_active: boolean;
  cursor: string;
  last_crawled_at: string | null;
  last_error: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface PaginatedWire<T> {
  results: T[];
}

interface QueuedTaskResponseWire {
  task_id: string;
  status: 'queued';
}

interface ConnectSourceInput {
  platform: CrawlSourcePlatform;
  sourceKey: string;
}

interface UpdateSourceInput {
  id: string;
  isActive: boolean;
}

function requireAuthToken(): string {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Connect wallet and authenticate to manage data sources.');
  }
  api.setToken(token);
  return token;
}

function mapQueuedTaskResponse(raw: QueuedTaskResponseWire): QueuedTaskResponse {
  return {
    taskId: raw.task_id,
    status: raw.status,
  };
}

function mapSource(raw: CrawlSourceConfigWire): CrawlSourceConfig {
  return {
    id: raw.id,
    platform: raw.platform,
    sourceKey: raw.source_key,
    isActive: raw.is_active,
    cursor: raw.cursor,
    lastCrawledAt: raw.last_crawled_at,
    lastError: raw.last_error,
    metadata: raw.metadata,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function normalizeSourceKey(platform: CrawlSourcePlatform, sourceKey: string): string {
  const trimmed = sourceKey.trim();
  if (platform === 'twitter') {
    return trimmed.replace(/^@/, '').toLowerCase();
  }
  if (platform === 'reddit') {
    const normalized = trimmed.replace(/^r\//i, '').replace(/^\/+|\/+$/g, '');
    return normalized.toLowerCase();
  }
  return trimmed;
}

function buildTriggerPayload(platform: CrawlSourcePlatform, sourceKey: string): Record<string, string> {
  const normalized = normalizeSourceKey(platform, sourceKey);
  switch (platform) {
    case 'twitter':
      return { username: normalized };
    case 'reddit':
      return { subreddit: normalized };
    case 'discord':
      return { channel_id: normalized };
    case 'telegram':
      return { chat_id: normalized };
  }
}

export function useCrawlSources() {
  const queryClient = useQueryClient();

  const sourcesQuery = useQuery({
    queryKey: ['crawl-sources'],
    queryFn: async () => {
      requireAuthToken();
      const raw = await api.get<CrawlSourceConfigWire[] | PaginatedWire<CrawlSourceConfigWire>>(
        '/contributions/sources/'
      );
      const rows = Array.isArray(raw) ? raw : raw.results;
      return rows.map(mapSource);
    },
    retry: false,
  });

  const connectSourceMutation = useMutation({
    mutationKey: ['connect-source'],
    mutationFn: async ({ platform, sourceKey }: ConnectSourceInput) => {
      requireAuthToken();
      const payload = buildTriggerPayload(platform, sourceKey);
      const raw = await api.post<QueuedTaskResponseWire>(`/contributions/crawl/${platform}/`, payload);
      return mapQueuedTaskResponse(raw);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crawl-sources'] });
    },
  });

  const runSourceMutation = useMutation({
    mutationKey: ['run-source'],
    mutationFn: async (id: string) => {
      requireAuthToken();
      const raw = await api.post<QueuedTaskResponseWire>(`/contributions/sources/${id}/crawl/`);
      return mapQueuedTaskResponse(raw);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crawl-sources'] });
    },
  });

  const updateSourceMutation = useMutation({
    mutationKey: ['update-source'],
    mutationFn: async ({ id, isActive }: UpdateSourceInput) => {
      requireAuthToken();
      const raw = await api.patch<CrawlSourceConfigWire>(`/contributions/sources/${id}/`, {
        is_active: isActive,
      });
      return mapSource(raw);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crawl-sources'] });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationKey: ['delete-source'],
    mutationFn: async (id: string) => {
      requireAuthToken();
      await api.delete(`/contributions/sources/${id}/`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crawl-sources'] });
    },
  });

  return {
    sourcesQuery,
    connectSourceMutation,
    runSourceMutation,
    updateSourceMutation,
    deleteSourceMutation,
  };
}
