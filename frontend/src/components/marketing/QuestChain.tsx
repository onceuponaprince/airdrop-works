"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Mail, Twitter, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

export type QuestStep = "wallet" | "email" | "twitter" | "submit"

const STEPS: { id: QuestStep; label: string; icon: React.ReactNode; subtitle: string }[] = [
  { id: "wallet",  label: "Forge Your Identity",        icon: <Wallet size={14} />,  subtitle: "Connect wallet to begin" },
  { id: "email",   label: "Verify Your Sigil",          icon: <Mail size={14} />,    subtitle: "Confirm your email" },
  { id: "twitter", label: "Reveal Your Contributions",  icon: <Twitter size={14} />, subtitle: "Optional — earn a teaser score" },
  { id: "submit",  label: "Claim Your Score",           icon: <Trophy size={14} />,  subtitle: "Join the leaderboard" },
]

interface QuestChainProps {
  currentStep: QuestStep
  completedSteps: QuestStep[]
  children: React.ReactNode
}

export function QuestChain({ currentStep, completedSteps, children }: QuestChainProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="space-y-6 max-w-[480px] mx-auto">
      {/* Step tracker */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isCompleted = completedSteps.includes(step.id)
          const isCurrent = step.id === currentStep
          const isPast = i < currentIndex

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-8 h-8 rounded-sm border flex items-center justify-center transition-all duration-300",
                  isCompleted || isPast
                    ? "bg-primary/20 border-primary text-primary"
                    : isCurrent
                    ? "border-primary text-primary animate-pulse"
                    : "border-border text-muted-foreground/40"
                )}>
                  {step.icon}
                </div>
                <span className={cn(
                  "font-mono text-[8px] uppercase tracking-wider hidden sm:block",
                  isCurrent ? "text-primary" : "text-muted-foreground/40"
                )}>
                  {i + 1}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-1 transition-all duration-500",
                  isPast || isCompleted ? "bg-primary/40" : "bg-border"
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Current step label */}
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Step {currentIndex + 1} of {STEPS.length}
        </p>
        <h3 className="font-heading text-lg text-foreground mt-1">
          {STEPS[currentIndex].label}
        </h3>
        <p className="font-body text-xs text-muted-foreground mt-0.5">
          {STEPS[currentIndex].subtitle}
        </p>
      </div>

      {/* Step content with animated transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
