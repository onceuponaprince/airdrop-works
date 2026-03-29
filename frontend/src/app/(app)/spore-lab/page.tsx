'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type {
  SporeApiKeyListResponse,
  SporeBriefGenerateRequest,
  SporeBriefGenerateResponse,
  SporeAuditLogListResponse,
  SporeGraphQueryResponse,
  SporeGraphQueryRunListResponse,
  SporeOpsSummaryResponse,
  SporeRelationshipRunListResponse,
  SporeScoreRunListResponse,
  SporeTenantContextResponse,
  SporeGeneratedConcept,
  SporeTwitterRelationshipResponse,
  SporeUsageEventListResponse,
} from '@/types/api';

interface SporeGeneratedConceptWire {
  title: string;
  copy: string;
  engagement_prediction: number;
  risk_score: number;
  confidence_interval: [number, number];
  risk_flags: string[];
}

interface SporeBriefGenerateResponseWire {
  concepts: SporeGeneratedConceptWire[];
  model: string;
}

interface SporeGraphNodeWire {
  id: string;
  node_key: string;
  node_type: string;
  title: string;
  source_platform: string;
  payload: Record<string, unknown>;
  ingestion_batch_id: string;
  raw_ref: string;
  updated_at: string;
}

interface SporeGraphQueryResultRowWire {
  node_key: string;
  activation: number;
  node: SporeGraphNodeWire;
}

interface SporeGraphQueryResponseWire {
  query_hash: string;
  seed_nodes: string[];
  results: SporeGraphQueryResultRowWire[];
}

interface SporeTwitterRelationshipResponseWire {
  account_a: string;
  account_b: string;
  days: number;
  features: Record<string, number>;
}

interface SporeOpsSummaryResponseWire {
  nodes_total: number;
  edges_total: number;
  observations_total: number;
  score_runs_total: number;
  recent_score_runs_24h: number;
  avg_final_score: number;
}

interface SporeScoreRunWire {
  id: string;
  contribution_id: string;
  source_platform: string;
  score_version: string;
  context: Record<string, unknown>;
  variable_scores: Record<string, number>;
  explainability: Record<string, string>;
  confidence: number;
  final_score: number;
  created_at: string;
}

interface SporeScoreRunListResponseWire {
  count: number;
  results: SporeScoreRunWire[];
}

interface SporeGraphQueryRunWire {
  id: string;
  query_text: string;
  query_hash: string;
  hops: number;
  damping: number;
  top_k: number;
  seed_nodes: string[];
  result_count: number;
  results: Array<Record<string, unknown>>;
  created_at: string;
}

interface SporeGraphQueryRunListResponseWire {
  count: number;
  results: SporeGraphQueryRunWire[];
}

interface SporeRelationshipRunWire {
  id: string;
  account_a: string;
  account_b: string;
  days: number;
  features: Record<string, number>;
  created_at: string;
}

interface SporeRelationshipRunListResponseWire {
  count: number;
  results: SporeRelationshipRunWire[];
}

interface SporeTenantWire {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  plan: string;
  quota_daily_query: number;
  quota_daily_ingest: number;
  quota_daily_relationship: number;
  quota_daily_brief_generate: number;
  metadata: Record<string, unknown>;
}

interface SporeTenantContextResponseWire {
  active_tenant: SporeTenantWire;
  memberships: Array<{
    tenant: SporeTenantWire;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }>;
}

interface SporeApiKeyWire {
  id: string;
  tenant: SporeTenantWire;
  name: string;
  prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface SporeApiKeyListResponseWire {
  count: number;
  results: SporeApiKeyWire[];
}

interface SporeUsageEventWire {
  id: string;
  metric: string;
  units: number;
  status_code: number;
  request_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface SporeUsageEventListResponseWire {
  count: number;
  results: SporeUsageEventWire[];
}

interface SporeAuditLogWire {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface SporeAuditLogListResponseWire {
  count: number;
  results: SporeAuditLogWire[];
}

const DEFAULT_FORM: SporeBriefGenerateRequest = {
  brand: 'SPORE',
  audience: 'crypto builders',
  platform: 'twitter',
  tone: 'analytical',
  objective: 'increase high-quality engagement',
  budget: '',
  conceptCount: 5,
};

const DEFAULT_QUERY = {
  queryText: 'relationship between two accounts on twitter',
  hops: 2,
  damping: 0.65,
  topK: 10,
};

const DEFAULT_RELATIONSHIP = {
  accountA: 'alice',
  accountB: 'bob',
  days: 30,
};

const DEFAULT_INGEST = {
  sourcePlatform: 'manual' as const,
  externalId: '',
  title: '',
  text: '',
};

const DEFAULT_SCORE_FILTERS = {
  sourcePlatform: '',
  contributionId: '',
  minScore: '',
  maxScore: '',
};

function riskBadgeClass(riskScore: number): string {
  if (riskScore >= 75) return 'border-destructive/40 bg-destructive/10 text-destructive';
  if (riskScore >= 50) return 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]';
  return 'border-primary/40 bg-primary/10 text-primary';
}

function ConceptCard({ concept, idx }: { concept: SporeGeneratedConcept; idx: number }) {
  return (
    <motion.article
      className="rounded-lg border border-[--border] bg-[--card] p-4 space-y-3"
      variants={staggerItem}
      transition={{ delay: idx * 0.05 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[--muted-foreground]">Concept {idx + 1}</p>
          <h3 className="font-semibold text-base text-[--primary]">{concept.title}</h3>
        </div>
        <div
          className={`rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${riskBadgeClass(concept.riskScore)}`}
        >
          Risk {concept.riskScore}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[--foreground]">{concept.copy}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded border border-[--border] p-2">
          <p className="text-[10px] text-[--muted-foreground] uppercase tracking-wide">
            Predicted Engagement
          </p>
          <p className="mt-1 text-lg font-bold text-[--primary]">{concept.engagementPrediction}</p>
        </div>
        <div className="rounded border border-[--border] p-2">
          <p className="text-[10px] text-[--muted-foreground] uppercase tracking-wide">
            Confidence Interval
          </p>
          <p className="mt-1 text-lg font-bold text-[--primary]">
            {concept.confidenceInterval[0]} - {concept.confidenceInterval[1]}
          </p>
        </div>
      </div>

      {concept.riskFlags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {concept.riskFlags.map((flag) => (
            <span
              key={flag}
              className="rounded border border-[--border] bg-[--secondary] px-2 py-1 text-[10px] uppercase tracking-wide text-[--muted-foreground]"
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </motion.article>
  );
}

export default function SporeLabPage() {
  const notify = useNotificationStore((s) => s.push);
  const [form, setForm] = useState<SporeBriefGenerateRequest>(DEFAULT_FORM);
  const [queryForm, setQueryForm] = useState(DEFAULT_QUERY);
  const [relationshipForm, setRelationshipForm] = useState(DEFAULT_RELATIONSHIP);
  const [ingestForm, setIngestForm] = useState(DEFAULT_INGEST);
  const [selectedScoreRunId, setSelectedScoreRunId] = useState<string>('');
  const [scoreFilters, setScoreFilters] = useState(DEFAULT_SCORE_FILTERS);
  const [queryHistorySearch, setQueryHistorySearch] = useState('');
  const [relationshipHistoryFilters, setRelationshipHistoryFilters] = useState({
    accountA: '',
    accountB: '',
  });
  const [newApiKeyName, setNewApiKeyName] = useState('spore-automation');
  const [usageMetricFilter, setUsageMetricFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');

  const opsSummary = useQuery({
    queryKey: ['spore', 'ops', 'summary'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access SPORE ops summary.');
      }
      api.setToken(token);
      const raw = await api.get<SporeOpsSummaryResponseWire>('/spore/ops/summary/');
      return {
        nodesTotal: raw.nodes_total,
        edgesTotal: raw.edges_total,
        observationsTotal: raw.observations_total,
        scoreRunsTotal: raw.score_runs_total,
        recentScoreRuns24h: raw.recent_score_runs_24h,
        avgFinalScore: raw.avg_final_score,
      } satisfies SporeOpsSummaryResponse;
    },
    refetchInterval: 20000,
    retry: false,
  });

  const scoreRuns = useQuery({
    queryKey: ['spore', 'ops', 'score-runs', scoreFilters],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access score runs.');
      }
      api.setToken(token);
      const qs = new URLSearchParams({ limit: '12' });
      if (scoreFilters.sourcePlatform) qs.set('source_platform', scoreFilters.sourcePlatform);
      if (scoreFilters.contributionId) qs.set('contribution_id', scoreFilters.contributionId);
      if (scoreFilters.minScore) qs.set('min_score', scoreFilters.minScore);
      if (scoreFilters.maxScore) qs.set('max_score', scoreFilters.maxScore);

      const raw = await api.get<SporeScoreRunListResponseWire>(`/spore/ops/score-runs/?${qs.toString()}`);
      return {
        count: raw.count,
        results: raw.results.map((row) => ({
          id: row.id,
          contributionId: row.contribution_id,
          sourcePlatform: row.source_platform,
          scoreVersion: row.score_version,
          context: row.context,
          variableScores: row.variable_scores,
          explainability: row.explainability,
          confidence: row.confidence,
          finalScore: row.final_score,
          createdAt: row.created_at,
        })),
      } satisfies SporeScoreRunListResponse;
    },
    refetchInterval: 20000,
    retry: false,
  });

  const queryRuns = useQuery({
    queryKey: ['spore', 'ops', 'query-runs', queryHistorySearch],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access query history.');
      }
      api.setToken(token);
      const qs = new URLSearchParams({ limit: '12' });
      if (queryHistorySearch) qs.set('query_search', queryHistorySearch);

      const raw = await api.get<SporeGraphQueryRunListResponseWire>(
        `/spore/ops/query-runs/?${qs.toString()}`
      );
      return {
        count: raw.count,
        results: raw.results.map((row) => ({
          id: row.id,
          queryText: row.query_text,
          queryHash: row.query_hash,
          hops: row.hops,
          damping: row.damping,
          topK: row.top_k,
          seedNodes: row.seed_nodes,
          resultCount: row.result_count,
          results: row.results,
          createdAt: row.created_at,
        })),
      } satisfies SporeGraphQueryRunListResponse;
    },
    refetchInterval: 20000,
    retry: false,
  });

  const relationshipRuns = useQuery({
    queryKey: ['spore', 'ops', 'relationship-runs', relationshipHistoryFilters],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access relationship history.');
      }
      api.setToken(token);
      const qs = new URLSearchParams({ limit: '12' });
      if (relationshipHistoryFilters.accountA) qs.set('account_a', relationshipHistoryFilters.accountA);
      if (relationshipHistoryFilters.accountB) qs.set('account_b', relationshipHistoryFilters.accountB);
      const raw = await api.get<SporeRelationshipRunListResponseWire>(
        `/spore/ops/relationship-runs/?${qs.toString()}`
      );
      return {
        count: raw.count,
        results: raw.results.map((row) => ({
          id: row.id,
          accountA: row.account_a,
          accountB: row.account_b,
          days: row.days,
          features: row.features,
          createdAt: row.created_at,
        })),
      } satisfies SporeRelationshipRunListResponse;
    },
    refetchInterval: 20000,
    retry: false,
  });

  const tenantContext = useQuery({
    queryKey: ['spore', 'ops', 'tenant-context'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access tenant context.');
      }
      api.setToken(token);
      const raw = await api.get<SporeTenantContextResponseWire>('/spore/ops/tenant-context/');
      return {
        activeTenant: mapTenant(raw.active_tenant),
        memberships: raw.memberships.map((membership) => ({
          tenant: mapTenant(membership.tenant),
          role: membership.role,
        })),
      } satisfies SporeTenantContextResponse;
    },
    retry: false,
  });

  const apiKeys = useQuery({
    queryKey: ['spore', 'ops', 'api-keys'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access API keys.');
      }
      api.setToken(token);
      const raw = await api.get<SporeApiKeyListResponseWire>('/spore/ops/api-keys/');
      return {
        count: raw.count,
        results: raw.results.map((row) => ({
          id: row.id,
          tenant: mapTenant(row.tenant),
          name: row.name,
          prefix: row.prefix,
          isActive: row.is_active,
          lastUsedAt: row.last_used_at,
          createdAt: row.created_at,
          metadata: row.metadata,
        })),
      } satisfies SporeApiKeyListResponse;
    },
    retry: false,
  });

  const usageEvents = useQuery({
    queryKey: ['spore', 'ops', 'usage-events', usageMetricFilter],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access usage events.');
      }
      api.setToken(token);
      const qs = new URLSearchParams({ limit: '12' });
      if (usageMetricFilter) qs.set('metric', usageMetricFilter);
      const raw = await api.get<SporeUsageEventListResponseWire>(
        `/spore/ops/usage-events/?${qs.toString()}`
      );
      return {
        count: raw.count,
        results: raw.results.map((row) => ({
          id: row.id,
          metric: row.metric,
          units: row.units,
          statusCode: row.status_code,
          requestId: row.request_id,
          metadata: row.metadata,
          createdAt: row.created_at,
        })),
      } satisfies SporeUsageEventListResponse;
    },
    refetchInterval: 20000,
    retry: false,
  });

  const auditLogs = useQuery({
    queryKey: ['spore', 'ops', 'audit-logs', auditActionFilter],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access audit logs.');
      }
      api.setToken(token);
      const qs = new URLSearchParams({ limit: '12' });
      if (auditActionFilter) qs.set('action', auditActionFilter);
      const raw = await api.get<SporeAuditLogListResponseWire>(`/spore/ops/audit-logs/?${qs.toString()}`);
      return {
        count: raw.count,
        results: raw.results.map((row) => ({
          id: row.id,
          action: row.action,
          targetType: row.target_type,
          targetId: row.target_id,
          metadata: row.metadata,
          createdAt: row.created_at,
        })),
      } satisfies SporeAuditLogListResponse;
    },
    refetchInterval: 20000,
    retry: false,
  });

  const scoreRunDetail = useQuery({
    queryKey: ['spore', 'ops', 'score-run-detail', selectedScoreRunId],
    queryFn: async () => {
      if (!selectedScoreRunId) return null;
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to inspect score run details.');
      }
      api.setToken(token);
      const raw = await api.get<SporeScoreRunWire>(`/spore/ops/score-runs/${selectedScoreRunId}/`);
      return {
        id: raw.id,
        contributionId: raw.contribution_id,
        sourcePlatform: raw.source_platform,
        scoreVersion: raw.score_version,
        context: raw.context,
        variableScores: raw.variable_scores,
        explainability: raw.explainability,
        confidence: raw.confidence,
        finalScore: raw.final_score,
        createdAt: raw.created_at,
      };
    },
    enabled: Boolean(selectedScoreRunId),
    retry: false,
  });

  const generateConcepts = useMutation({
    mutationFn: async (payload: SporeBriefGenerateRequest) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate before generating concepts.');
      }
      api.setToken(token);

      const raw = await api.post<SporeBriefGenerateResponseWire>('/spore/briefs/generate/', {
        brand: payload.brand,
        audience: payload.audience,
        platform: payload.platform,
        tone: payload.tone,
        objective: payload.objective,
        budget: payload.budget || '',
        concept_count: payload.conceptCount ?? 5,
      });

      return {
        model: raw.model,
        concepts: raw.concepts.map((concept) => ({
          title: concept.title,
          copy: concept.copy,
          engagementPrediction: concept.engagement_prediction,
          riskScore: concept.risk_score,
          confidenceInterval: concept.confidence_interval,
          riskFlags: concept.risk_flags,
        })),
      } satisfies SporeBriefGenerateResponse;
    },
    onSuccess: () => {
      notify({
        type: 'success',
        title: 'SPORE concepts generated',
        message: 'Review score, confidence interval, and risk for each concept.',
      });
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'Generation failed',
        message: err instanceof Error ? err.message : 'Unable to generate concepts.',
      });
    },
  });

  const runGraphQuery = useMutation({
    mutationFn: async (payload: typeof DEFAULT_QUERY) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate before running graph queries.');
      }
      api.setToken(token);
      const raw = await api.post<SporeGraphQueryResponseWire>('/spore/query/', {
        query_text: payload.queryText,
        hops: payload.hops,
        damping: payload.damping,
        top_k: payload.topK,
      });
      return {
        queryHash: raw.query_hash,
        seedNodes: raw.seed_nodes,
        results: raw.results.map((row) => ({
          nodeKey: row.node_key,
          activation: row.activation,
          node: {
            id: row.node.id,
            nodeKey: row.node.node_key,
            nodeType: row.node.node_type,
            title: row.node.title,
            sourcePlatform: row.node.source_platform,
            payload: row.node.payload,
            ingestionBatchId: row.node.ingestion_batch_id,
            rawRef: row.node.raw_ref,
            updatedAt: row.node.updated_at,
          },
        })),
      } satisfies SporeGraphQueryResponse;
    },
    onSuccess: (data) => {
      notify({
        type: 'success',
        title: 'Graph query complete',
        message: `Retrieved ${data.results.length} activated nodes.`,
      });
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'Graph query failed',
        message: err instanceof Error ? err.message : 'Unable to query SPORE graph.',
      });
    },
  });

  const analyzeRelationship = useMutation({
    mutationFn: async (payload: typeof DEFAULT_RELATIONSHIP) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate before relationship analysis.');
      }
      api.setToken(token);

      const query = new URLSearchParams({
        account_a: payload.accountA,
        account_b: payload.accountB,
        days: String(payload.days),
      });
      const raw = await api.get<SporeTwitterRelationshipResponseWire>(
        `/spore/relationships/twitter/?${query.toString()}`
      );
      return {
        accountA: raw.account_a,
        accountB: raw.account_b,
        days: raw.days,
        features: raw.features,
      } satisfies SporeTwitterRelationshipResponse;
    },
    onSuccess: () => {
      notify({
        type: 'success',
        title: 'Relationship analysis complete',
        message: 'Pairwise account features have been computed from SPORE graph data.',
      });
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'Relationship analysis failed',
        message: err instanceof Error ? err.message : 'Unable to compute pair features.',
      });
    },
  });

  const quickIngest = useMutation({
    mutationFn: async (payload: typeof DEFAULT_INGEST) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate before ingesting content.');
      }
      api.setToken(token);
      return api.post('/spore/ingest/', {
        source_platform: payload.sourcePlatform,
        external_id: payload.externalId,
        title: payload.title || '',
        text: payload.text,
        metadata: { created_from: 'spore_lab' },
      });
    },
    onSuccess: () => {
      notify({
        type: 'success',
        title: 'Content ingested',
        message: 'SPORE node created and indexed.',
      });
      setIngestForm(DEFAULT_INGEST);
      opsSummary.refetch();
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'Ingest failed',
        message: err instanceof Error ? err.message : 'Unable to ingest content.',
      });
    },
  });

  const createApiKey = useMutation({
    mutationFn: async (payload: { tenantSlug: string; name: string }) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate before creating API keys.');
      }
      api.setToken(token);
      return api.post<{ api_key: SporeApiKeyWire; plaintext_key: string }>('/spore/ops/api-keys/', {
        tenant_slug: payload.tenantSlug,
        name: payload.name,
      });
    },
    onSuccess: (result) => {
      notify({
        type: 'success',
        title: 'API key created',
        message: `Save this now: ${result.plaintext_key}`,
      });
      apiKeys.refetch();
      auditLogs.refetch();
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'API key creation failed',
        message: err instanceof Error ? err.message : 'Unable to create API key.',
      });
    },
  });

  const revokeApiKey = useMutation({
    mutationFn: async (apiKeyId: string) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate before revoking API keys.');
      }
      api.setToken(token);
      return api.post(`/spore/ops/api-keys/${apiKeyId}/revoke/`, {});
    },
    onSuccess: () => {
      notify({
        type: 'success',
        title: 'API key revoked',
        message: 'Key has been deactivated.',
      });
      apiKeys.refetch();
      auditLogs.refetch();
    },
    onError: (err) => {
      notify({
        type: 'error',
        title: 'API key revoke failed',
        message: err instanceof Error ? err.message : 'Unable to revoke API key.',
      });
    },
  });

  const concepts = useMemo(() => generateConcepts.data?.concepts ?? [], [generateConcepts.data]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    generateConcepts.mutate(form);
  };

  const handleQuerySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runGraphQuery.mutate(queryForm);
  };

  const handleRelationshipSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    analyzeRelationship.mutate(relationshipForm);
  };

  const relationshipFeatures = analyzeRelationship.data?.features ?? {};
  const relationshipFeatureRows = Object.entries(relationshipFeatures).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const scoreRunRows = scoreRuns.data?.results ?? [];
  const queryRunRows = queryRuns.data?.results ?? [];
  const relationshipRunRows = relationshipRuns.data?.results ?? [];
  const apiKeyRows = apiKeys.data?.results ?? [];
  const usageRows = usageEvents.data?.results ?? [];
  const auditRows = auditLogs.data?.results ?? [];
  const activeTenant = tenantContext.data?.activeTenant;

  return (
    <motion.main
      className="flex-1 space-y-8 overflow-y-auto p-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">SPORE Lab</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">
          Brief -&gt; generated concepts -&gt; engagement prediction + risk signals
        </p>
      </motion.div>

      <motion.section variants={staggerItem} className="rounded-lg border border-[--border] bg-[--card] p-4">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-1">
            <span className="text-xs text-[--muted-foreground]">Brand</span>
            <input
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
              className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-[--muted-foreground]">Audience</span>
            <input
              value={form.audience}
              onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
              className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-[--muted-foreground]">Platform</span>
            <select
              value={form.platform}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  platform: e.target.value as SporeBriefGenerateRequest['platform'],
                }))
              }
              className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
            >
              <option value="twitter">Twitter</option>
              <option value="discord">Discord</option>
              <option value="telegram">Telegram</option>
              <option value="github">GitHub</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-[--muted-foreground]">Tone</span>
            <input
              value={form.tone}
              onChange={(e) => setForm((prev) => ({ ...prev, tone: e.target.value }))}
              className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-[--muted-foreground]">Objective</span>
            <textarea
              value={form.objective}
              onChange={(e) => setForm((prev) => ({ ...prev, objective: e.target.value }))}
              className="min-h-[92px] w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-[--muted-foreground]">Budget (optional)</span>
            <input
              value={form.budget}
              onChange={(e) => setForm((prev) => ({ ...prev, budget: e.target.value }))}
              className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-[--muted-foreground]">Concept count</span>
            <input
              type="number"
              min={1}
              max={10}
              value={form.conceptCount ?? 5}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, conceptCount: Number(e.target.value || 5) }))
              }
              className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={generateConcepts.isPending}
              className="rounded border border-[--primary] bg-[--primary] px-4 py-2 text-sm font-semibold text-[--primary-foreground] disabled:opacity-60"
            >
              {generateConcepts.isPending ? 'Generating...' : 'Generate Concepts'}
            </button>
          </div>
        </form>
      </motion.section>

      <motion.section variants={staggerItem} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[--primary]">Generated Concepts</h2>
          {generateConcepts.data?.model && (
            <span className="text-xs text-[--muted-foreground]">Model: {generateConcepts.data.model}</span>
          )}
        </div>

        {generateConcepts.isError && (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {generateConcepts.error instanceof Error
              ? generateConcepts.error.message
              : 'Unable to generate concepts right now.'}
          </div>
        )}

        {concepts.length === 0 && !generateConcepts.isPending ? (
          <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-sm text-[--muted-foreground]">
            Submit a brief to generate concepts and compare predicted engagement/risk.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {concepts.map((concept, idx) => (
              <ConceptCard key={`${concept.title}-${idx}`} concept={concept} idx={idx} />
            ))}
          </div>
        )}
      </motion.section>

      <motion.section variants={staggerItem} className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-[--border] bg-[--card] p-4">
          <h2 className="text-lg font-semibold text-[--primary]">Graph Query Explorer</h2>
          <p className="text-xs text-[--muted-foreground]">
            Query -&gt; seed nodes -&gt; spreading activation -&gt; ranked retrieval.
          </p>

          <form className="space-y-3" onSubmit={handleQuerySubmit}>
            <label className="space-y-1 block">
              <span className="text-xs text-[--muted-foreground]">Query Text</span>
              <textarea
                value={queryForm.queryText}
                onChange={(e) => setQueryForm((prev) => ({ ...prev, queryText: e.target.value }))}
                className="min-h-[76px] w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
                required
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-[--muted-foreground]">Hops</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={queryForm.hops}
                  onChange={(e) =>
                    setQueryForm((prev) => ({ ...prev, hops: Number(e.target.value || 2) }))
                  }
                  className="w-full rounded border border-[--border] bg-[--background] px-2 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[--muted-foreground]">Damping</span>
                <input
                  type="number"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={queryForm.damping}
                  onChange={(e) =>
                    setQueryForm((prev) => ({ ...prev, damping: Number(e.target.value || 0.65) }))
                  }
                  className="w-full rounded border border-[--border] bg-[--background] px-2 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[--muted-foreground]">Top K</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={queryForm.topK}
                  onChange={(e) =>
                    setQueryForm((prev) => ({ ...prev, topK: Number(e.target.value || 10) }))
                  }
                  className="w-full rounded border border-[--border] bg-[--background] px-2 py-2 text-sm"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={runGraphQuery.isPending}
              className="rounded border border-[--primary] bg-[--primary] px-4 py-2 text-sm font-semibold text-[--primary-foreground] disabled:opacity-60"
            >
              {runGraphQuery.isPending ? 'Querying...' : 'Run Graph Query'}
            </button>
          </form>

          {runGraphQuery.data && (
            <div className="space-y-3">
              <div className="rounded border border-[--border] bg-[--background] p-2 text-xs text-[--muted-foreground]">
                <p>query_hash: {runGraphQuery.data.queryHash}</p>
                <p>seed_nodes: {runGraphQuery.data.seedNodes.join(', ') || 'none'}</p>
              </div>
              <button
                type="button"
                onClick={() => exportGraphQueryCsv(runGraphQuery.data)}
                className="rounded border border-[--border] px-2 py-1 text-xs font-semibold text-[--muted-foreground] hover:bg-[--secondary]"
              >
                Export Query CSV
              </button>
              <div className="space-y-2">
                {runGraphQuery.data.results.map((row, idx) => (
                  <div
                    key={`${row.nodeKey}-${idx}`}
                    className="rounded border border-[--border] bg-[--background] p-2"
                  >
                    <p className="text-xs text-[--muted-foreground]">{row.node.nodeType}</p>
                    <p className="text-sm font-semibold text-[--primary]">{row.node.title || row.node.nodeKey}</p>
                    <p className="text-xs text-[--muted-foreground]">
                      activation={row.activation.toFixed(5)} | platform={row.node.sourcePlatform}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-[--border] bg-[--card] p-4">
          <h2 className="text-lg font-semibold text-[--primary]">Twitter Pair Analyzer</h2>
          <p className="text-xs text-[--muted-foreground]">
            Score relationship variables between two accounts over a rolling time window.
          </p>

          <form className="space-y-3" onSubmit={handleRelationshipSubmit}>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-[--muted-foreground]">Account A</span>
                <input
                  value={relationshipForm.accountA}
                  onChange={(e) =>
                    setRelationshipForm((prev) => ({ ...prev, accountA: e.target.value }))
                  }
                  className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[--muted-foreground]">Account B</span>
                <input
                  value={relationshipForm.accountB}
                  onChange={(e) =>
                    setRelationshipForm((prev) => ({ ...prev, accountB: e.target.value }))
                  }
                  className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
                  required
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs text-[--muted-foreground]">Days</span>
              <input
                type="number"
                min={1}
                max={365}
                value={relationshipForm.days}
                onChange={(e) =>
                  setRelationshipForm((prev) => ({ ...prev, days: Number(e.target.value || 30) }))
                }
                className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={analyzeRelationship.isPending}
              className="rounded border border-[--primary] bg-[--primary] px-4 py-2 text-sm font-semibold text-[--primary-foreground] disabled:opacity-60"
            >
              {analyzeRelationship.isPending ? 'Analyzing...' : 'Analyze Relationship'}
            </button>
          </form>

          {relationshipFeatureRows.length > 0 && (
            <>
              <button
                type="button"
                onClick={() =>
                  exportRelationshipCsv({
                    accountA: analyzeRelationship.data?.accountA ?? '',
                    accountB: analyzeRelationship.data?.accountB ?? '',
                    days: analyzeRelationship.data?.days ?? relationshipForm.days,
                    features: relationshipFeatures,
                  })
                }
                className="rounded border border-[--border] px-2 py-1 text-xs font-semibold text-[--muted-foreground] hover:bg-[--secondary]"
              >
                Export Relationship CSV
              </button>
              <div className="space-y-2">
                {relationshipFeatureRows.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded border border-[--border] bg-[--background] px-3 py-2"
                  >
                    <span className="text-xs uppercase tracking-wide text-[--muted-foreground]">{key}</span>
                    <span className="text-sm font-semibold text-[--primary]">{value.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.section>

      <motion.section variants={staggerItem} className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4 xl:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-[--primary]">SPORE Ops Summary</h2>
          {opsSummary.isLoading ? (
            <p className="text-sm text-[--muted-foreground]">Loading summary...</p>
          ) : opsSummary.isError ? (
            <p className="text-sm text-destructive">
              {opsSummary.error instanceof Error ? opsSummary.error.message : 'Unable to load summary.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Nodes" value={opsSummary.data?.nodesTotal ?? 0} />
              <StatTile label="Edges" value={opsSummary.data?.edgesTotal ?? 0} />
              <StatTile label="Observations" value={opsSummary.data?.observationsTotal ?? 0} />
              <StatTile label="Score Runs" value={opsSummary.data?.scoreRunsTotal ?? 0} />
              <StatTile label="24h Runs" value={opsSummary.data?.recentScoreRuns24h ?? 0} />
              <StatTile
                label="Avg Score"
                value={Number((opsSummary.data?.avgFinalScore ?? 0).toFixed(2))}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              opsSummary.refetch();
              scoreRuns.refetch();
            }}
            className="rounded border border-[--border] px-3 py-2 text-xs font-semibold text-[--muted-foreground] hover:bg-[--secondary]"
          >
            Refresh Ops Data
          </button>
        </div>

        <div className="rounded-lg border border-[--border] bg-[--card] p-4 xl:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-[--primary]">Quick Ingest + Recent Score Runs</h2>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              quickIngest.mutate(ingestForm);
            }}
          >
            <label className="space-y-1">
              <span className="text-xs text-[--muted-foreground]">External ID</span>
              <input
                value={ingestForm.externalId}
                onChange={(e) => setIngestForm((prev) => ({ ...prev, externalId: e.target.value }))}
                className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
                placeholder="spore-lab-001"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-[--muted-foreground]">Title (optional)</span>
              <input
                value={ingestForm.title}
                onChange={(e) => setIngestForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-[--muted-foreground]">Text Content</span>
              <textarea
                value={ingestForm.text}
                onChange={(e) => setIngestForm((prev) => ({ ...prev, text: e.target.value }))}
                className="min-h-[80px] w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
                required
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={quickIngest.isPending}
                className="rounded border border-[--primary] bg-[--primary] px-4 py-2 text-sm font-semibold text-[--primary-foreground] disabled:opacity-60"
              >
                {quickIngest.isPending ? 'Ingesting...' : 'Quick Ingest'}
              </button>
            </div>
          </form>

          <div className="grid gap-2 sm:grid-cols-4 rounded border border-[--border] bg-[--background] p-2">
            <input
              value={scoreFilters.sourcePlatform}
              onChange={(e) =>
                setScoreFilters((prev) => ({ ...prev, sourcePlatform: e.target.value.trim() }))
              }
              placeholder="platform (twitter)"
              className="rounded border border-[--border] bg-[--card] px-2 py-1 text-xs"
            />
            <input
              value={scoreFilters.contributionId}
              onChange={(e) =>
                setScoreFilters((prev) => ({ ...prev, contributionId: e.target.value.trim() }))
              }
              placeholder="contribution id"
              className="rounded border border-[--border] bg-[--card] px-2 py-1 text-xs"
            />
            <input
              value={scoreFilters.minScore}
              onChange={(e) => setScoreFilters((prev) => ({ ...prev, minScore: e.target.value.trim() }))}
              placeholder="min score"
              className="rounded border border-[--border] bg-[--card] px-2 py-1 text-xs"
            />
            <input
              value={scoreFilters.maxScore}
              onChange={(e) => setScoreFilters((prev) => ({ ...prev, maxScore: e.target.value.trim() }))}
              placeholder="max score"
              className="rounded border border-[--border] bg-[--card] px-2 py-1 text-xs"
            />
          </div>

          {scoreRuns.isLoading ? (
            <p className="text-sm text-[--muted-foreground]">Loading score runs...</p>
          ) : scoreRuns.isError ? (
            <p className="text-sm text-destructive">
              {scoreRuns.error instanceof Error ? scoreRuns.error.message : 'Unable to load score runs.'}
            </p>
          ) : scoreRunRows.length === 0 ? (
            <p className="text-sm text-[--muted-foreground]">No score runs yet.</p>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => exportScoreRunsCsv(scoreRunRows)}
                className="rounded border border-[--border] px-2 py-1 text-xs font-semibold text-[--muted-foreground] hover:bg-[--secondary]"
              >
                Export Score Runs CSV
              </button>
              {scoreRunRows.map((run) => (
                <div
                  key={run.id}
                  className="grid grid-cols-4 gap-2 rounded border border-[--border] bg-[--background] px-3 py-2"
                >
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[--muted-foreground]">Score</p>
                    <p className="text-sm font-semibold text-[--primary]">{run.finalScore}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[--muted-foreground]">Confidence</p>
                    <p className="text-sm font-semibold text-[--primary]">{run.confidence.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[--muted-foreground]">Platform</p>
                    <p className="text-sm font-semibold text-[--primary]">{run.sourcePlatform}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[--muted-foreground]">Created</p>
                    <p className="text-xs text-[--muted-foreground]">
                      {new Date(run.createdAt).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedScoreRunId(run.id)}
                      className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[--primary] hover:underline"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedScoreRunId && (
            <div className="rounded border border-[--border] bg-[--background] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[--primary]">Score Run Detail</h3>
                <button
                  type="button"
                  onClick={() => setSelectedScoreRunId('')}
                  className="text-[10px] uppercase tracking-wide text-[--muted-foreground] hover:text-[--foreground]"
                >
                  Close
                </button>
              </div>
              {scoreRunDetail.isLoading ? (
                <p className="text-xs text-[--muted-foreground]">Loading detail...</p>
              ) : scoreRunDetail.isError ? (
                <p className="text-xs text-destructive">
                  {scoreRunDetail.error instanceof Error
                    ? scoreRunDetail.error.message
                    : 'Unable to load score run detail.'}
                </p>
              ) : scoreRunDetail.data ? (
                <div className="space-y-2">
                  <p className="text-xs text-[--muted-foreground]">
                    id={scoreRunDetail.data.id} | contribution={scoreRunDetail.data.contributionId || '-'}
                  </p>
                  <pre className="max-h-44 overflow-auto rounded border border-[--border] p-2 text-[10px] text-[--muted-foreground]">
                    {JSON.stringify(scoreRunDetail.data.variableScores, null, 2)}
                  </pre>
                  <pre className="max-h-44 overflow-auto rounded border border-[--border] p-2 text-[10px] text-[--muted-foreground]">
                    {JSON.stringify(scoreRunDetail.data.explainability, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </motion.section>

      <motion.section variants={staggerItem} className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4 space-y-3">
          <h2 className="text-lg font-semibold text-[--primary]">Graph Query History</h2>
          <input
            value={queryHistorySearch}
            onChange={(e) => setQueryHistorySearch(e.target.value)}
            placeholder="search query text"
            className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-xs"
          />
          {queryRuns.isLoading ? (
            <p className="text-xs text-[--muted-foreground]">Loading query history...</p>
          ) : queryRuns.isError ? (
            <p className="text-xs text-destructive">
              {queryRuns.error instanceof Error ? queryRuns.error.message : 'Unable to load query history.'}
            </p>
          ) : queryRunRows.length === 0 ? (
            <p className="text-xs text-[--muted-foreground]">No query runs found.</p>
          ) : (
            <div className="space-y-2">
              {queryRunRows.map((run) => (
                <div key={run.id} className="rounded border border-[--border] bg-[--background] p-2">
                  <p className="text-xs text-[--muted-foreground]">{new Date(run.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-semibold text-[--primary]">{run.queryText}</p>
                  <p className="text-xs text-[--muted-foreground]">
                    hash={run.queryHash} | results={run.resultCount} | hops={run.hops} | damping=
                    {run.damping}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[--border] bg-[--card] p-4 space-y-3">
          <h2 className="text-lg font-semibold text-[--primary]">Relationship History</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={relationshipHistoryFilters.accountA}
              onChange={(e) =>
                setRelationshipHistoryFilters((prev) => ({ ...prev, accountA: e.target.value }))
              }
              placeholder="account A"
              className="rounded border border-[--border] bg-[--background] px-3 py-2 text-xs"
            />
            <input
              value={relationshipHistoryFilters.accountB}
              onChange={(e) =>
                setRelationshipHistoryFilters((prev) => ({ ...prev, accountB: e.target.value }))
              }
              placeholder="account B"
              className="rounded border border-[--border] bg-[--background] px-3 py-2 text-xs"
            />
          </div>
          {relationshipRuns.isLoading ? (
            <p className="text-xs text-[--muted-foreground]">Loading relationship history...</p>
          ) : relationshipRuns.isError ? (
            <p className="text-xs text-destructive">
              {relationshipRuns.error instanceof Error
                ? relationshipRuns.error.message
                : 'Unable to load relationship history.'}
            </p>
          ) : relationshipRunRows.length === 0 ? (
            <p className="text-xs text-[--muted-foreground]">No relationship runs found.</p>
          ) : (
            <div className="space-y-2">
              {relationshipRunRows.map((run) => (
                <div key={run.id} className="rounded border border-[--border] bg-[--background] p-2">
                  <p className="text-xs text-[--muted-foreground]">{new Date(run.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-semibold text-[--primary]">
                    @{run.accountA} vs @{run.accountB}
                  </p>
                  <p className="text-xs text-[--muted-foreground]">
                    days={run.days} | features={Object.keys(run.features).length}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      <motion.section variants={staggerItem} className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4 space-y-3">
          <h2 className="text-lg font-semibold text-[--primary]">Tenant Context</h2>
          {tenantContext.isLoading ? (
            <p className="text-xs text-[--muted-foreground]">Loading tenant context...</p>
          ) : tenantContext.isError ? (
            <p className="text-xs text-destructive">
              {tenantContext.error instanceof Error
                ? tenantContext.error.message
                : 'Unable to load tenant context.'}
            </p>
          ) : activeTenant ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[--primary]">
                {activeTenant.name} ({activeTenant.slug})
              </p>
              <p className="text-xs text-[--muted-foreground]">Plan: {activeTenant.plan}</p>
              <p className="text-xs text-[--muted-foreground]">
                Quotas/day: query {activeTenant.quotaDailyQuery}, ingest {activeTenant.quotaDailyIngest},
                relationship {activeTenant.quotaDailyRelationship}, brief {activeTenant.quotaDailyBriefGenerate}
              </p>
            </div>
          ) : (
            <p className="text-xs text-[--muted-foreground]">No tenant assigned.</p>
          )}
        </div>

        <div className="rounded-lg border border-[--border] bg-[--card] p-4 space-y-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[--primary]">API Keys</h2>
            <button
              type="button"
              onClick={() => apiKeys.refetch()}
              className="rounded border border-[--border] px-2 py-1 text-xs font-semibold text-[--muted-foreground] hover:bg-[--secondary]"
            >
              Refresh
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const tenantSlug = activeTenant?.slug;
              if (!tenantSlug) return;
              createApiKey.mutate({ tenantSlug, name: newApiKeyName.trim() || 'spore-automation' });
            }}
          >
            <input
              value={newApiKeyName}
              onChange={(e) => setNewApiKeyName(e.target.value)}
              className="flex-1 rounded border border-[--border] bg-[--background] px-3 py-2 text-xs"
              placeholder="api key name"
            />
            <button
              type="submit"
              disabled={createApiKey.isPending || !activeTenant}
              className="rounded border border-[--primary] bg-[--primary] px-3 py-2 text-xs font-semibold text-[--primary-foreground] disabled:opacity-60"
            >
              {createApiKey.isPending ? 'Creating...' : 'Create Key'}
            </button>
          </form>
          {apiKeys.isLoading ? (
            <p className="text-xs text-[--muted-foreground]">Loading API keys...</p>
          ) : apiKeys.isError ? (
            <p className="text-xs text-destructive">
              {apiKeys.error instanceof Error ? apiKeys.error.message : 'Unable to load API keys.'}
            </p>
          ) : apiKeyRows.length === 0 ? (
            <p className="text-xs text-[--muted-foreground]">No API keys created yet.</p>
          ) : (
            <div className="space-y-2">
              {apiKeyRows.map((keyRow) => (
                <div
                  key={keyRow.id}
                  className="flex items-center justify-between rounded border border-[--border] bg-[--background] p-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-[--primary]">{keyRow.name}</p>
                    <p className="text-[10px] text-[--muted-foreground]">
                      {keyRow.prefix}... | {keyRow.isActive ? 'active' : 'revoked'} | last used{' '}
                      {keyRow.lastUsedAt ? new Date(keyRow.lastUsedAt).toLocaleString() : 'never'}
                    </p>
                  </div>
                  {keyRow.isActive && (
                    <button
                      type="button"
                      onClick={() => revokeApiKey.mutate(keyRow.id)}
                      disabled={revokeApiKey.isPending}
                      className="rounded border border-destructive/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-destructive"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      <motion.section variants={staggerItem} className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-[--border] bg-[--card] p-4 space-y-3">
          <h2 className="text-lg font-semibold text-[--primary]">Usage Events</h2>
          <input
            value={usageMetricFilter}
            onChange={(e) => setUsageMetricFilter(e.target.value)}
            placeholder="metric filter (spore.query)"
            className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-xs"
          />
          {usageEvents.isLoading ? (
            <p className="text-xs text-[--muted-foreground]">Loading usage events...</p>
          ) : usageEvents.isError ? (
            <p className="text-xs text-destructive">
              {usageEvents.error instanceof Error ? usageEvents.error.message : 'Unable to load usage events.'}
            </p>
          ) : usageRows.length === 0 ? (
            <p className="text-xs text-[--muted-foreground]">No usage events found.</p>
          ) : (
            <div className="space-y-2">
              {usageRows.map((eventRow) => (
                <div key={eventRow.id} className="rounded border border-[--border] bg-[--background] p-2">
                  <p className="text-sm font-semibold text-[--primary]">{eventRow.metric}</p>
                  <p className="text-xs text-[--muted-foreground]">
                    units={eventRow.units} | status={eventRow.statusCode} |{' '}
                    {new Date(eventRow.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[--border] bg-[--card] p-4 space-y-3">
          <h2 className="text-lg font-semibold text-[--primary]">Audit Logs</h2>
          <input
            value={auditActionFilter}
            onChange={(e) => setAuditActionFilter(e.target.value)}
            placeholder="action filter (spore.api_key.create)"
            className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-xs"
          />
          {auditLogs.isLoading ? (
            <p className="text-xs text-[--muted-foreground]">Loading audit logs...</p>
          ) : auditLogs.isError ? (
            <p className="text-xs text-destructive">
              {auditLogs.error instanceof Error ? auditLogs.error.message : 'Unable to load audit logs.'}
            </p>
          ) : auditRows.length === 0 ? (
            <p className="text-xs text-[--muted-foreground]">No audit logs found.</p>
          ) : (
            <div className="space-y-2">
              {auditRows.map((logRow) => (
                <div key={logRow.id} className="rounded border border-[--border] bg-[--background] p-2">
                  <p className="text-sm font-semibold text-[--primary]">{logRow.action}</p>
                  <p className="text-xs text-[--muted-foreground]">
                    {logRow.targetType}:{logRow.targetId || '-'} |{' '}
                    {new Date(logRow.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>
    </motion.main>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-[--border] bg-[--background] p-2">
      <p className="text-[10px] uppercase tracking-wide text-[--muted-foreground]">{label}</p>
      <p className="text-sm font-semibold text-[--primary]">{value}</p>
    </div>
  );
}

function mapTenant(tenant: SporeTenantWire) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    isActive: tenant.is_active,
    plan: tenant.plan,
    quotaDailyQuery: tenant.quota_daily_query,
    quotaDailyIngest: tenant.quota_daily_ingest,
    quotaDailyRelationship: tenant.quota_daily_relationship,
    quotaDailyBriefGenerate: tenant.quota_daily_brief_generate,
    metadata: tenant.metadata,
  };
}

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header] ?? '')).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const csv = toCsv(rows);
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportGraphQueryCsv(data: SporeGraphQueryResponse) {
  const rows = data.results.map((row) => ({
    queryHash: data.queryHash,
    nodeKey: row.nodeKey,
    nodeType: row.node.nodeType,
    title: row.node.title || '',
    sourcePlatform: row.node.sourcePlatform,
    activation: row.activation,
  }));
  downloadCsv('spore_graph_query.csv', rows);
}

function exportRelationshipCsv(data: {
  accountA: string;
  accountB: string;
  days: number;
  features: Record<string, number>;
}) {
  const rows = Object.entries(data.features).map(([feature, value]) => ({
    accountA: data.accountA,
    accountB: data.accountB,
    days: data.days,
    feature,
    value,
  }));
  downloadCsv('spore_relationship_features.csv', rows);
}

function exportScoreRunsCsv(rows: SporeScoreRunListResponse['results']) {
  downloadCsv(
    'spore_score_runs.csv',
    rows.map((run) => ({
      id: run.id,
      contributionId: run.contributionId,
      sourcePlatform: run.sourcePlatform,
      scoreVersion: run.scoreVersion,
      finalScore: run.finalScore,
      confidence: run.confidence,
      createdAt: run.createdAt,
    }))
  );
}

