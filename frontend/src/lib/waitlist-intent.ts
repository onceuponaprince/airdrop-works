/** Waitlist signup intents — stored in Supabase `source` for segmentation. */
export const WAITLIST_INTENT_CAMPAIGN_PILOT = "campaign_integrity_pilot" as const

export type WaitlistSignupIntent = typeof WAITLIST_INTENT_CAMPAIGN_PILOT

const VALID_INTENTS = new Set<string>([WAITLIST_INTENT_CAMPAIGN_PILOT])

export function parseWaitlistIntent(
  value: string | null | undefined
): WaitlistSignupIntent | undefined {
  if (!value || !VALID_INTENTS.has(value)) return undefined
  return value as WaitlistSignupIntent
}

export function waitlistUrlWithIntent(intent: WaitlistSignupIntent): string {
  return `/?intent=${encodeURIComponent(intent)}#waitlist`
}

export function waitlistIntentLabel(intent: WaitlistSignupIntent): string {
  if (intent === WAITLIST_INTENT_CAMPAIGN_PILOT) {
    return "Campaign Integrity Pilot"
  }
  return intent
}
