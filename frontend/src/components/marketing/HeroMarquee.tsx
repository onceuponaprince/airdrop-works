"use client"

import { useState } from "react"
const CRYPTO_TWITTER_HANDLES = [
  "VitalikButerin",
  "cz_binance",
  "saylor",
  "cobie",
  "punk6529",
  "balajis",
  "naval",
  "aantonop",
  "CryptoHayes",
  "farokh",
  "gmoneyNFT",
  "justinsuntron",
  "tier10k",
  "rektcapital",
  "Ansem",
  "DeeZe",
  "CryptoCobain",
  "zhusu",
  "CryptoKaleo",
  "blknoiz06",
] as const

type MarqueeColumnConfig = {
  handles: readonly string[]
  direction: "up" | "down"
  duration: number
}

/** Split handles across columns with alternating scroll direction */
function buildColumns(): MarqueeColumnConfig[] {
  const columnCount = 6
  const columns: MarqueeColumnConfig[] = []

  for (let i = 0; i < columnCount; i++) {
    const handles = CRYPTO_TWITTER_HANDLES.filter((_, idx) => idx % columnCount === i)
    columns.push({
      handles,
      direction: i % 2 === 0 ? "up" : "down",
      duration: 28 + i * 4,
    })
  }

  return columns
}

const MARQUEE_COLUMNS = buildColumns()

function avatarUrl(handle: string) {
  return `https://unavatar.io/x/${encodeURIComponent(handle)}?size=96`
}

function fallbackAvatarUrl(handle: string) {
  const label = encodeURIComponent(handle.replace(/_/g, " ").slice(0, 2))
  return `https://ui-avatars.com/api/?name=${label}&size=96&background=13141D&color=10B981&bold=true`
}

function MarqueeAvatar({ handle }: { handle: string }) {
  const [src, setSrc] = useState(() => avatarUrl(handle))
  const [failed, setFailed] = useState(false)

  return (
    <div className="hero-marquee-avatar group shrink-0">
      <div className="size-12 shrink-0 overflow-hidden rounded-full bg-card/80 ring-1 ring-primary/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          width={48}
          height={48}
          referrerPolicy="no-referrer"
          className="size-12 rounded-full object-cover"
          onError={() => {
            if (!failed) {
              setFailed(true)
              setSrc(fallbackAvatarUrl(handle))
            }
          }}
        />
      </div>
      <span className="hero-marquee-handle font-mono text-[8px] uppercase tracking-wider text-muted-foreground/50 truncate max-w-[72px]">
        @{handle}
      </span>
    </div>
  )
}

function MarqueeColumn({ handles, direction, duration }: MarqueeColumnConfig) {
  const trackClass =
    direction === "up" ? "hero-marquee-track-up" : "hero-marquee-track-down"

  const items = [...handles, ...handles]

  return (
    <div className="hero-marquee-column" aria-hidden="true">
      <div
        className={trackClass}
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {items.map((handle, idx) => (
          <MarqueeAvatar key={`${handle}-${idx}`} handle={handle} />
        ))}
      </div>
    </div>
  )
}

export function HeroMarquee() {
  return (
    <div className="hero-marquee-container pointer-events-none" aria-hidden="true">
      <div className="hero-marquee-fade-center absolute inset-0 z-[1]" />
      <div className="hero-marquee-grid">
        {MARQUEE_COLUMNS.map((col, i) => (
          <MarqueeColumn key={i} {...col} />
        ))}
      </div>
    </div>
  )
}
