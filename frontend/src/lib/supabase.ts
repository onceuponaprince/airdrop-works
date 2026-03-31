import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ""
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnon)) {
  console.warn(
    "[Supabase] Missing env vars — waitlist submissions will fail until configured."
  )
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnon)

export interface WaitlistInsert {
  email:           string
  wallet_address?: string | null
  primary_branch?: string | null
  referral_code?:  string | null
  source?:         string | null
}

export interface WaitlistResult {
  rank:          number
  referralCode:  string
  alreadyExists: boolean
}

export async function insertWaitlistEntry(entry: WaitlistInsert): Promise<WaitlistResult> {
  const email = entry.email.toLowerCase().trim()

  // Check for existing entry first
  const { data: existing } = await supabase
    .from("waitlist_entries")
    .select("rank, referral_code")
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    return { rank: existing.rank, referralCode: existing.referral_code, alreadyExists: true }
  }

  const { data, error } = await supabase
    .from("waitlist_entries")
    .insert({
      email,
      wallet_address: entry.wallet_address ?? null,
      primary_branch: entry.primary_branch ?? null,
      referred_by:    entry.referral_code  ?? null,
      source:         entry.source ?? "organic",
    })
    .select("rank, referral_code")
    .single()

  if (error) {
    if (error.code === "23505") {
      const { data: raceData } = await supabase
        .from("waitlist_entries")
        .select("rank, referral_code")
        .eq("email", email)
        .single()
      return { rank: raceData?.rank ?? 1, referralCode: raceData?.referral_code ?? "", alreadyExists: true }
    }
    throw new Error(`Waitlist insert failed: ${error.message}`)
  }

  return { rank: data.rank, referralCode: data.referral_code, alreadyExists: false }
}

export async function getWaitlistCount(): Promise<number> {
  const { count, error } = await supabase
    .from("waitlist_entries")
    .select("*", { count: "exact", head: true })
  if (error) return 0
  return count ?? 0
}

export async function getReferralCount(referralCode: string): Promise<number> {
  const { count } = await supabase
    .from("waitlist_entries")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", referralCode)
  return count ?? 0
}

/**
 * Check if an email has been approved on the waitlist.
 * Requires an `approved` boolean column on the `waitlist_entries` table
 * in Supabase (default false, manually set to true for approved users).
 */
export async function checkWhitelistApproval(email: string): Promise<{
  exists: boolean;
  approved: boolean;
  rank: number | null;
}> {
  const { data } = await supabase
    .from("waitlist_entries")
    .select("approved, rank")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle()

  if (!data) return { exists: false, approved: false, rank: null }
  return { exists: true, approved: data.approved === true, rank: data.rank ?? null }
}

export function buildReferralUrl(referralCode: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://airdrop.works"
  return `${base}/?ref=${referralCode}`
}
