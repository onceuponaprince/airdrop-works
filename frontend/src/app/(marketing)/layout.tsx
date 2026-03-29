import type { Metadata } from "next"
import { ConsentAwareAnalytics } from "@/components/shared/ConsentAwareAnalytics"
import { Navigation } from "@/components/shared/Navigation"
import { Footer } from "@/components/shared/Footer"

const GA_ID = "G-DWTQJ0H0S1"

export const metadata: Metadata = {
  title: "AI(r)Drop — AI-Powered Airdrop Scoring for Real Contributors",
}



export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  return (
    <>
      <ConsentAwareAnalytics gaId={GA_ID} />
      <Navigation />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </>
  )
}