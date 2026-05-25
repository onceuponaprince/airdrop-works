import { describe, expect, it } from "vitest"
import {
  buildFakeWaitlistSuccess,
  isBotSubmission,
  MIN_SUBMIT_MS,
} from "@/lib/waitlist-bot-guard"

describe("waitlist-bot-guard", () => {
  const now = 1_700_000_000_000
  const validUa =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"

  it("rejects honeypot submissions", () => {
    expect(
      isBotSubmission({
        honeypot: "https://spam.example",
        userAgent: validUa,
        now,
        formStartedAt: now - MIN_SUBMIT_MS,
      }),
    ).toBe(true)
  })

  it("rejects empty user-agent", () => {
    expect(
      isBotSubmission({
        userAgent: "",
        now,
        formStartedAt: now - MIN_SUBMIT_MS,
      }),
    ).toBe(true)
  })

  it("rejects known bot user-agents", () => {
    expect(
      isBotSubmission({
        userAgent: "curl/8.4.0",
        now,
        formStartedAt: now - MIN_SUBMIT_MS,
      }),
    ).toBe(true)
  })

  it("rejects submissions faster than MIN_SUBMIT_MS", () => {
    expect(
      isBotSubmission({
        userAgent: validUa,
        formStartedAt: now - 200,
        now,
      }),
    ).toBe(true)
  })

  it("allows legitimate submissions with elapsed time and clean UA", () => {
    expect(
      isBotSubmission({
        userAgent: validUa,
        formStartedAt: now - MIN_SUBMIT_MS,
        now,
      }),
    ).toBe(false)
  })

  it("buildFakeWaitlistSuccess returns ok:true without throwing", () => {
    const payload = buildFakeWaitlistSuccess("https://airdrop.works")
    expect(payload.ok).toBe(true)
    expect(payload.rank).toBeGreaterThan(0)
    expect(payload.referralCode).toMatch(/^bot-/)
    expect(payload.referralUrl).toContain("ref=")
    expect(payload.alreadyExists).toBe(false)
  })
})
