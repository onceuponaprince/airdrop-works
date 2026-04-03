"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Wallet } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useWaitlist } from "@/hooks/useWaitlist"
import { useReferral } from "@/hooks/useReferral"
import { useOptionalDynamicContext } from "@/hooks/useOptionalDynamicContext"
import { BRANCHES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { scoreReveal } from "@/styles/theme"
import type { Branch } from "@/lib/constants"

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  walletAddress: z.string().optional(),
  primaryBranch: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function SuccessCard({
  rank,
  referralUrl,
  alreadyExists,
  hadWallet,
}: {
  rank: number
  referralUrl: string | null
  alreadyExists: boolean
  hadWallet: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!referralUrl) return
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div {...scoreReveal} className="space-y-4 max-w-[480px] mx-auto">
      <ArcadeCard glow className="py-8 space-y-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {alreadyExists ? "Already on the list" : "You're in"}
        </p>
        <div>
          <p className="font-mono text-xs text-muted-foreground mb-1">Waitlist Rank</p>
          <span className="font-display text-5xl text-primary glow-green">#{rank}</span>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          {alreadyExists
            ? "You're already registered. Check your email for your referral link."
            : "We'll ping you when scoring goes live. Check your email."}
        </p>
        {hadWallet ? (
          <p className="font-mono text-[10px] text-primary text-center">
            Wallet linked → beta access reserved before the queue opens.
          </p>
        ) : (
          <p className="font-mono text-[10px] text-muted-foreground text-center">
            No wallet linked — connect one to move up the list.
          </p>
        )}
      </ArcadeCard>

      {referralUrl && (
        <ArcadeCard className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Move up the list
          </p>
          <p className="font-body text-xs text-muted-foreground">
            Each referral bumps you higher. Share your link:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs text-primary bg-background rounded-sm border border-border px-3 py-2 truncate">
              {referralUrl}
            </code>
            <button
              onClick={handleCopy}
              className={cn(
                "flex-shrink-0 px-3 py-2 rounded-sm border font-mono text-xs transition-all",
                copied
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </ArcadeCard>
      )}
    </motion.div>
  )
}

export function WaitlistForm() {
  const [hadWalletAtSuccess, setHadWalletAtSuccess] = useState(false)
  const { status, rank, referralUrl, alreadyExists, error, submit } = useWaitlist()
  const inboundReferralCode = useReferral()
  const [honeypot, setHoneypot] = useState("")
  const dynamicContext = useOptionalDynamicContext()
  const connectedAddress = dynamicContext.primaryWallet?.address

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (connectedAddress) {
      setValue("walletAddress", connectedAddress)
    }
  }, [connectedAddress, setValue])

  const onSubmit = (data: FormValues) => {
    const hadWallet = Boolean(data.walletAddress?.trim())
    setHadWalletAtSuccess(hadWallet)

    submit({
      email: data.email,
      walletAddress: data.walletAddress || undefined,
      primaryBranch: data.primaryBranch as Branch | undefined,
      referralCode: inboundReferralCode || undefined,
      honeypot: honeypot || undefined,
    })
  }

  const isSubmitting = status === "submitting"

  if (status === "success" && rank) {
    return (
      <SuccessCard
        rank={rank}
        referralUrl={referralUrl}
        alreadyExists={alreadyExists}
        hadWallet={hadWalletAtSuccess}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-[480px] mx-auto">
      {/* Email */}
      <div className="space-y-1.5">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Email <span className="text-destructive">*</span>
        </label>
        <Input
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          {...register("email")}
          className={cn(errors.email && "border-destructive focus:ring-destructive")}
        />
        {errors.email && (
          <p className="font-body text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Wallet address */}
      <div className="space-y-1.5">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Wallet Address{" "}
          <span className="text-muted-foreground/40 normal-case tracking-normal font-body text-[10px]">
            — links your identity · wallet holders get beta access first
          </span>
        </label>

        {connectedAddress ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-sm border border-primary/40 bg-primary/5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
            <code className="font-mono text-xs text-primary flex-1 truncate">
              {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
            </code>
            <button
              type="button"
              onClick={() => {
                dynamicContext.setShowAuthFlow(true)
              }}
              className="font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              change
            </button>
            <input type="hidden" {...register("walletAddress")} />
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => dynamicContext.setShowAuthFlow(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-sm border border-primary/40 text-primary font-mono text-xs hover:bg-primary/10 transition-colors"
            >
              <Wallet size={14} />
              Connect Wallet
            </button>
            <Input
              type="text"
              placeholder="or paste 0x... manually"
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-xs text-muted-foreground placeholder:text-muted-foreground/30"
              {...register("walletAddress")}
            />
          </div>
        )}
      </div>

      {/* Primary branch */}
      <div className="space-y-1.5">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Primary Branch{" "}
          <span className="text-muted-foreground/40 normal-case tracking-normal font-body text-[10px]">
            (optional)
          </span>
        </label>
        <Select onValueChange={(v) => setValue("primaryBranch", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select your contribution style" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BRANCHES).map(([key, branch]) => (
              <SelectItem key={key} value={key}>
                <span className="font-body text-sm">{branch.label}</span>
                <span className="font-body text-xs text-muted-foreground ml-2">
                  — {branch.description}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <p className="font-body text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      {/* Honeypot — hidden field invisible to real users, auto-filled by bots */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Submit */}
      <ArcadeButton
        type="submit"
        size="lg"
        className="w-full"
        loading={isSubmitting}
      >
        Join the Waitlist
      </ArcadeButton>

      <p className="font-body text-xs text-muted-foreground/50 text-center">
        No token purchase. No tasks. Just bring your contributions.
      </p>
    </form>
  )
}
