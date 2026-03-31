import { HeroSection }        from "@/components/marketing/HeroSection"
import { AiJudgeDemo }        from "@/components/marketing/AiJudgeDemo"
import { TwitterAnalyzer }    from "@/components/marketing/TwitterAnalyzer"
import { ProblemSection }     from "@/components/marketing/ProblemSection"
import { SolutionSection }    from "@/components/marketing/SolutionSection"
import { FeaturesSection }    from "@/components/marketing/FeaturesSection"
import { ComparisonSection }  from "@/components/marketing/ComparisonSection"
import { SocialProofSection } from "@/components/marketing/SocialProofSection"
import { FAQSection }         from "@/components/marketing/FAQSection"
import { CTASection }         from "@/components/marketing/CTASection"
import { DonateSection }      from "@/components/marketing/DonateSection"

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <AiJudgeDemo />
      <TwitterAnalyzer />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <ComparisonSection />
      <SocialProofSection />
      <FAQSection />
      <DonateSection />
      <CTASection />
    </>
  )
}
