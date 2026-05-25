/** Bot detection for waitlist POST — bots get fake 200, no Supabase insert. */

export const MIN_SUBMIT_MS = 1500

const BOT_UA_PATTERNS = [
  /curl\//i,
  /python-requests/i,
  /scrapy/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /wget/i,
  /httpclient/i,
  /libwww-perl/i,
  /go-http-client/i,
]

export interface BotCheckInput {
  honeypot?: string
  formStartedAt?: number
  userAgent?: string | null
  now?: number
}

export function isBotSubmission(input: BotCheckInput): boolean {
  if (input.honeypot?.trim()) return true

  const ua = input.userAgent?.trim() ?? ""
  if (!ua) return true

  if (BOT_UA_PATTERNS.some((pattern) => pattern.test(ua))) return true

  if (typeof input.formStartedAt === "number") {
    const now = input.now ?? Date.now()
    const elapsed = now - input.formStartedAt
    if (elapsed >= 0 && elapsed < MIN_SUBMIT_MS) return true
  }

  return false
}

/** Fake success payload — matches client expectations; includes `ok: true` for monitoring. */
export function buildFakeWaitlistSuccess(siteBase = "https://airdrop.works") {
  const referralCode = "bot-" + Math.random().toString(36).slice(2, 8)
  return {
    ok: true,
    rank: Math.floor(Math.random() * 500) + 100,
    referralCode,
    referralUrl: `${siteBase.replace(/\/$/, "")}/?ref=${referralCode}`,
    alreadyExists: false,
  }
}
