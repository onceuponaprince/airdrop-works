import type { Metadata } from 'next';
import { ScorePageClient } from './ScorePageClient';

function clamp(v: number) {
  return Math.max(0, Math.min(100, isNaN(v) ? 0 : v));
}

const VALID_FLAGS = new Set(['genuine', 'farming', 'ambiguous']);

interface ScorePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: ScorePageProps): Promise<Metadata> {
  const params = await searchParams;
  const composite = clamp(Number(params.composite ?? 0));
  const teaching = clamp(Number(params.teaching ?? 0));
  const originality = clamp(Number(params.originality ?? 0));
  const impact = clamp(Number(params.impact ?? 0));
  const rawFlag = String(params.flag ?? 'genuine');
  const flag = VALID_FLAGS.has(rawFlag) ? rawFlag : 'genuine';

  const ogUrl = `/api/og/score?composite=${composite}&teaching=${teaching}&originality=${originality}&impact=${impact}&flag=${flag}`;

  const flagLabel = flag.charAt(0).toUpperCase() + flag.slice(1);
  const title = `AI Judge Score: ${composite}/100 — ${flagLabel}`;
  const description = `Teaching ${teaching} · Originality ${originality} · Impact ${impact}. Scored by the AI Judge on AI(r)Drop.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function ScorePage({ searchParams }: ScorePageProps) {
  const params = await searchParams;
  const composite = clamp(Number(params.composite ?? 0));
  const teaching = clamp(Number(params.teaching ?? 0));
  const originality = clamp(Number(params.originality ?? 0));
  const impact = clamp(Number(params.impact ?? 0));
  const rawFlag = String(params.flag ?? 'genuine');
  const flag = VALID_FLAGS.has(rawFlag) ? rawFlag : 'genuine';

  return (
    <ScorePageClient
      composite={composite}
      teaching={teaching}
      originality={originality}
      impact={impact}
      flag={flag as 'genuine' | 'farming' | 'ambiguous'}
    />
  );
}
