import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

const FARMING_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> =
  {
    genuine: { label: 'GENUINE', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: '#10B98150' },
    farming: { label: 'FARMING', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: '#EF444450' },
    ambiguous: { label: 'AMBIGUOUS', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: '#F59E0B50' },
  };

const DIMENSIONS = [
  { key: 'teaching', label: 'Teaching Value', color: '#10B981' },
  { key: 'originality', label: 'Originality', color: '#A855F7' },
  { key: 'impact', label: 'Community Impact', color: '#06B6D4' },
];

let pressStart2PFont: ArrayBuffer | null = null;
let jetBrainsMonoFont: ArrayBuffer | null = null;

async function loadFonts() {
  if (!pressStart2PFont) {
    const res = await fetch(
      'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2'
    );
    pressStart2PFont = await res.arrayBuffer();
  }
  if (!jetBrainsMonoFont) {
    const res = await fetch(
      'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2'
    );
    jetBrainsMonoFont = await res.arrayBuffer();
  }
}

function clamp(v: number) {
  return Math.max(0, Math.min(100, isNaN(v) ? 0 : v));
}

export async function GET(request: NextRequest) {
  await loadFonts();

  const { searchParams } = request.nextUrl;
  const composite = clamp(Number(searchParams.get('composite') ?? 0));
  const teaching = clamp(Number(searchParams.get('teaching') ?? 0));
  const originality = clamp(Number(searchParams.get('originality') ?? 0));
  const impact = clamp(Number(searchParams.get('impact') ?? 0));
  const flag = searchParams.get('flag') ?? 'genuine';

  const flagConfig = FARMING_LABELS[flag] ?? FARMING_LABELS.genuine;
  const dimValues = [teaching, originality, impact];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          background: 'linear-gradient(135deg, #0A0B10 0%, #13141D 50%, #0A0B10 100%)',
          fontFamily: 'JetBrains Mono',
          color: '#E8ECF4',
        }}
      >
        {/* Left: Score Card */}
        <div
          style={{
            width: 660,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '48px 56px',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#6B7280',
                }}
              >
                AI JUDGE SCORE
              </span>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
                <span
                  style={{
                    fontFamily: 'Press Start 2P',
                    fontSize: 72,
                    color: '#10B981',
                    lineHeight: 1,
                    textShadow: '0 0 20px rgba(16,185,129,0.6), 0 0 40px rgba(16,185,129,0.3)',
                  }}
                >
                  {String(composite).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 20, color: '#6B7280', marginBottom: 6 }}>/100</span>
              </div>
            </div>

            {/* Farming badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 4,
                border: `1px solid ${flagConfig.border}`,
                background: flagConfig.bg,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: flagConfig.color,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: flagConfig.color,
                }}
              >
                {flagConfig.label}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: '#1F2937',
              marginTop: 32,
              marginBottom: 32,
              width: '100%',
            }}
          />

          {/* Dimension bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {DIMENSIONS.map((dim, i) => (
              <div key={dim.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#6B7280',
                    }}
                  >
                    {dim.label}
                  </span>
                  <span style={{ fontSize: 18, color: dim.color, fontWeight: 500 }}>
                    {String(dimValues[i]).padStart(2, '0')}
                  </span>
                </div>
                {/* Bar track */}
                <div
                  style={{
                    height: 10,
                    borderRadius: 3,
                    background: '#1E293B',
                    width: '100%',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      height: 10,
                      borderRadius: 3,
                      background: dim.color,
                      width: `${dimValues[i]}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Brand panel */}
        <div
          style={{
            width: 540,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '48px 40px',
            borderLeft: '1px solid #1F2937',
          }}
        >
          <span
            style={{
              fontFamily: 'Press Start 2P',
              fontSize: 22,
              color: '#10B981',
              textShadow: '0 0 12px rgba(16,185,129,0.5)',
              letterSpacing: '0.08em',
            }}
          >
            AI(r)DROP
          </span>

          <span
            style={{
              fontSize: 16,
              color: '#E8ECF4',
              marginTop: 20,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            The AI Judge scored this.
          </span>

          <span
            style={{
              fontSize: 13,
              color: '#6B7280',
              marginTop: 12,
              textAlign: 'center',
            }}
          >
            Quality over volume. Context over clicks.
          </span>

          <div
            style={{
              marginTop: 48,
              padding: '10px 24px',
              borderRadius: 4,
              border: '1px solid #10B98140',
              background: 'rgba(16,185,129,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: '#10B981', letterSpacing: '0.05em' }}>
              airdrop.works — see your score
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Press Start 2P', data: pressStart2PFont!, style: 'normal', weight: 400 },
        { name: 'JetBrains Mono', data: jetBrainsMonoFont!, style: 'normal', weight: 400 },
      ],
    }
  );
}
