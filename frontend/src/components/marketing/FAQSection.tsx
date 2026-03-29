import { AnimatedSection } from "@/components/shared/AnimatedSection"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const FAQS = [
  {
    q: "What is AI(r)Drop, exactly?",
    a: "A platform that uses AI to score Web3 contributions by quality — teaching value, originality, and community impact — instead of engagement volume. Think of it as the anti-Galxe: we judge what you create, not how many checkboxes you click. Projects use it to distribute airdrops fairly.",
  },
  {
    q: "How does the AI Judge work? Can it be gamed?",
    a: "The AI Judge uses contextual AI (Anthropic Claude) to read contributions and score them across three dimensions. It also runs a farming detection layer that identifies bot patterns, mass reposting, and incentivized engagement. Can it be gamed? Eventually, someone will try. But contextual quality scoring is orders of magnitude harder to fake than like counts.",
  },
  {
    q: "Is my data safe? Do you scrape my accounts?",
    a: "No scraping. Period. All platform connections require OAuth — you explicitly authorize access. You can disconnect any account at any time. We read your public contributions to score them. We don't store your DMs, private messages, or non-public content.",
  },
  {
    q: "What chains do you support?",
    a: "EVM chains first — Avalanche C-Chain and Base at launch — with Solana coming in Phase 2. Rewards distribute on your preferred chain. Badge NFTs and ProfileNFTs are cross-chain portable.",
  },
  {
    q: "Is this a token project? Do I need to buy anything?",
    a: "No. AI(r)Drop is a platform, not a token. InnovatorTokens are an in-platform reward — you earn them through contributions, not by buying them. There is no ICO, no token sale, no speculative mechanic.",
  },
  {
    q: "How is this different from Kaito?",
    a: "Kaito scored engagement metrics — impressions, retweets, reach. That's gameable by bots, which is exactly what happened and why Kaito is dead. AI(r)Drop scores contribution quality — whether your content teaches, creates, or builds. It's the difference between measuring how loud you are vs. what you're actually saying.",
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="py-24 bg-card/20">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Questions
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
            You&apos;re Skeptical.{" "}
            <span className="text-primary">Good.</span>
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <Accordion type="single" collapsible className="space-y-0">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimatedSection>
      </div>
    </section>
  )
}
