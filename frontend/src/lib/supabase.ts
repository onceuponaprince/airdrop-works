import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ""
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnon)) {
  console.warn(
    "[Supabase] Missing env vars — waitlist submissions will fail until configured."
  )
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnon)

export const WAITLIST_WALLET_CONFLICT = "WAITLIST_WALLET_CONFLICT"

export interface WaitlistInsert {
  email:               string
  /** Omit or undefined = do not change on update */
  wallet_address?:     string | null
  primary_branch?:     string | null
  referral_code?:      string | null
  source?:             string | null
  /** Server-computed; never trust the client */
  flagged?:            boolean
  twitter_handle?:     string | null
  twitter_score_data?: Record<string, unknown> | null
}

export interface WaitlistResult {
  rank:          number
  referralCode:  string
  alreadyExists: boolean
}

function normalizeWallet(addr: string | null | undefined): string | null {
  const s = addr?.trim()
  if (!s) return null
  if (s.startsWith("0x")) return s.toLowerCase()
  return s
}

export async function insertWaitlistEntry(entry: WaitlistInsert): Promise<WaitlistResult> {
  const email = entry.email.toLowerCase().trim()
  const db = supabase

  const { data: existing } = await db
    .from("waitlist_entries")
    .select("rank, referral_code, wallet_address, primary_branch, flagged")
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    const nextWallet =
      entry.wallet_address !== undefined && entry.wallet_address !== null
        ? normalizeWallet(entry.wallet_address)
        : normalizeWallet(existing.wallet_address as string | null)
    const nextBranch =
      entry.primary_branch !== undefined && entry.primary_branch !== null
        ? entry.primary_branch
        : (existing.primary_branch as string | null)
    const nextFlagged = Boolean(entry.flagged) || Boolean(existing.flagged)

    if (nextWallet) {
      const { data: walletRow } = await db
        .from("waitlist_entries")
        .select("email")
        .eq("wallet_address", nextWallet)
        .maybeSingle()
      if (walletRow && (walletRow as { email: string }).email.toLowerCase() !== email) {
        const err = new Error(WAITLIST_WALLET_CONFLICT)
        throw err
      }
    }

    const { error: upErr } = await db
      .from("waitlist_entries")
      .update({
        wallet_address: nextWallet,
        primary_branch: nextBranch,
        flagged:        nextFlagged,
      })
      .eq("email", email)

    if (upErr) {
      if (upErr.code === "23505") {
        const err = new Error(WAITLIST_WALLET_CONFLICT)
        throw err
      }
      throw new Error(`Waitlist update failed: ${upErr.message}`)
    }

    return {
      rank:          existing.rank,
      referralCode:  existing.referral_code,
      alreadyExists: true,
    }
  }

  const walletForInsert = normalizeWallet(entry.wallet_address ?? null)

  if (walletForInsert) {
    const { data: taken } = await db
      .from("waitlist_entries")
      .select("email")
      .eq("wallet_address", walletForInsert)
      .maybeSingle()
    if (taken) {
      const err = new Error(WAITLIST_WALLET_CONFLICT)
      throw err
    }
  }

  // Build the insert payload — twitter fields are optional and may not exist
  // in the database schema yet. If the insert fails, retry without them.
  const basePayload = {
    email,
    wallet_address: walletForInsert,
    primary_branch: entry.primary_branch ?? null,
    referred_by:    entry.referral_code ?? null,
    source:         entry.source ?? "organic",
    flagged:        entry.flagged ?? false,
  }

  const twitterPayload = entry.twitter_handle ? {
    twitter_handle:       entry.twitter_handle,
    twitter_score_data:   entry.twitter_score_data ?? null,
    twitter_connected_at: new Date().toISOString(),
  } : {}

  let { data, error } = await db
    .from("waitlist_entries")
    .insert({ ...basePayload, ...twitterPayload })
    .select("rank, referral_code")
    .single()

  // If insert fails due to unknown column (twitter fields not migrated),
  // retry without twitter fields so signup still works.
  if (error && error.message?.includes("column") && Object.keys(twitterPayload).length > 0) {
    console.warn("[Waitlist] Twitter columns not in schema, retrying without them:", error.message)
    const retry = await db
      .from("waitlist_entries")
      .insert(basePayload)
      .select("rank, referral_code")
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) {
    if (error.code === "23505") {
      const { data: raceByEmail } = await db
        .from("waitlist_entries")
        .select("rank, referral_code")
        .eq("email", email)
        .maybeSingle()
      if (raceByEmail) {
        return {
          rank:          raceByEmail.rank,
          referralCode:  raceByEmail.referral_code,
          alreadyExists: true,
        }
      }
      throw new Error(WAITLIST_WALLET_CONFLICT)
    }
    throw new Error(`Waitlist insert failed: ${error.message}`)
  }

  if (!data) {
    throw new Error("Waitlist insert returned no data")
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
  if (typeof window !== "undefined") {
    return `${window.location.origin}/?ref=${referralCode}`
  }
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://airdrop.works"
  return `${base}/?ref=${referralCode}`
}
