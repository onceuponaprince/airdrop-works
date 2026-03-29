import { NextResponse } from 'next/server';
import { getWaitlistCount } from '@/lib/supabase';

function nowMs(): number {
  return performance.now();
}

async function timedFetch(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; latencyMs: number }> {
  const start = nowMs();
  const res = await fetch(url, init);
  return { ok: res.ok, status: res.status, latencyMs: Math.round(nowMs() - start) };
}

export async function GET() {
  const backendBase = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');

  const [health, judgeProbe, waitlistCount] = await Promise.allSettled([
    timedFetch(`${backendBase}/health/`),
    timedFetch(`${backendBase}/api/v1/judge/demo/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Observability health probe' }),
    }),
    getWaitlistCount(),
  ]);

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    backendHealth: health.status === 'fulfilled' ? health.value : null,
    judgeLatency: judgeProbe.status === 'fulfilled' ? judgeProbe.value : null,
    waitlistCount: waitlistCount.status === 'fulfilled' ? waitlistCount.value : 0,
    queueDepth: null,
    cacheHitRate: null,
  });
}
