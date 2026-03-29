import type { Metadata } from "next"
import { fontVariables } from "@/lib/fonts"
import { CookieConsentBanner } from "@/components/shared/CookieConsentBanner"
import { Providers } from "@/providers/Providers"
import { Analytics } from "@vercel/analytics/react"
import "@/app/globals.css"

export const metadata: Metadata = {
  title: {
    default: "AI(r)Drop — AI-Powered Airdrop Scoring for Real Contributors",
    template: "%s | AI(r)Drop",
  },
  description:
    "Airdrops reward bots, not builders. AI(r)Drop uses AI to score contributions by quality — not volume. Paste a tweet and see your real score.",
  keywords: [
    "airdrop scoring",
    "AI airdrop",
    "web3 contributions",
    "crypto rewards",
    "contribution scoring",
    "DeFi educator",
  ],
  authors: [{ name: "Yurika", url: "https://yurika.space" }],
  creator: "Yurika",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://airdrop.works",
    siteName: "AI(r)Drop",
    title: "AI(r)Drop: Airdrops That Reward What Actually Matters",
    description:
      "The AI Judge scores your contributions by teaching value, originality, and community impact. Bots get nothing. Real contributors get everything.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dark arcade-style interface showing the AI Judge scoring a tweet. Three score bars with neon green accents.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI(r)Drop: Airdrops That Reward What Actually Matters",
    description:
      "The AI Judge scores your contributions by teaching value, originality, and community impact.",
    creator: "@yuaboratory",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  metadataBase: new URL("https://airdrop.works"),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="bg-background text-foreground font-body antialiased min-h-screen">
        <Providers>{children}</Providers>
        <CookieConsentBanner />
        <Analytics />
      </body>
    </html>
  )
}
