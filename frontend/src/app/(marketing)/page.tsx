import { HeroSection }              from "@/components/marketing/HeroSection"
import { AiJudgeDemo }              from "@/components/marketing/AiJudgeDemo"
import { CampaignIntegritySection } from "@/components/marketing/CampaignIntegritySection"
import { SocialProofSection }       from "@/components/marketing/SocialProofSection"
import { CTASection }         from "@/components/marketing/CTASection"
import { TwitterAnalyzer }    from "@/components/marketing/TwitterAnalyzer"
import { ProblemSection }     from "@/components/marketing/ProblemSection"
import { SolutionSection }    from "@/components/marketing/SolutionSection"
import { FeaturesSection }    from "@/components/marketing/FeaturesSection"
import { ComparisonSection }  from "@/components/marketing/ComparisonSection"
import { FAQSection }         from "@/components/marketing/FAQSection"
import { DonateSection }      from "@/components/marketing/DonateSection"

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <AiJudgeDemo />
      <CampaignIntegritySection />
      <SocialProofSection />
      <ProblemSection />
      <SolutionSection />
      <CTASection />
      <TwitterAnalyzer />
      <FeaturesSection />
      <ComparisonSection />
      <FAQSection />
      <DonateSection />
    </>
  )
}
