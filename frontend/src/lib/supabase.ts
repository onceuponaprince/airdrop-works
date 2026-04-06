import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ""
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabaseKey =
  typeof window === "undefined" && supabaseServiceRole
    ? supabaseServiceRole
    : supabaseAnon

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnon)) {
  console.warn(
    "[Supabase] Missing env vars — waitlist submissions will fail until configured."
  )
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

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

type WaitlistExistingRow = {
  rank: number
  referral_code: string
  wallet_address?: string | null
  primary_branch?: string | null
  flagged?: boolean | null
}

function normalizeWallet(addr: string | null | undefined): string | null {
  const s = addr?.trim()
  if (!s) return null
  if (s.startsWith("0x")) return s.toLowerCase()
  return s
}

function getErrorMessage(error: { message?: string } | null | undefined): string {
  return error?.message?.toLowerCase() ?? ""
}

function isMissingColumnError(
  error: { message?: string } | null | undefined,
  columnName: string
): boolean {
  const message = getErrorMessage(error)
  return (
    message.includes(columnName.toLowerCase()) &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find"))
  )
}

function stripUnsupportedWaitlistColumns<T extends Record<string, unknown>>(
  payload: T,
  error: { message?: string } | null | undefined
): T | null {
  const nextPayload = { ...payload }
  let changed = false

  if ("flagged" in nextPayload && isMissingColumnError(error, "flagged")) {
    delete nextPayload.flagged
    changed = true
  }

  const missingTwitterColumn =
    isMissingColumnError(error, "twitter_handle") ||
    isMissingColumnError(error, "twitter_score_data") ||
    isMissingColumnError(error, "twitter_connected_at")

  if (missingTwitterColumn) {
    for (const key of ["twitter_handle", "twitter_score_data", "twitter_connected_at"]) {
      if (key in nextPayload) {
        delete nextPayload[key]
        changed = true
      }
    }
  }

  return changed ? (nextPayload as T) : null
}

async function getExistingWaitlistEntry(email: string): Promise<WaitlistExistingRow | null> {
  const fullResult = await supabase
    .from("waitlist_entries")
    .select("rank, referral_code, wallet_address, primary_branch, flagged")
    .eq("email", email)
    .maybeSingle()

  if (!fullResult.error) {
    return fullResult.data as WaitlistExistingRow | null
  }

  if (!isMissingColumnError(fullResult.error, "flagged")) {
    throw new Error(`Waitlist lookup failed: ${fullResult.error.message}`)
  }

  const fallbackResult = await supabase
    .from("waitlist_entries")
    .select("rank, referral_code, wallet_address, primary_branch")
    .eq("email", email)
    .maybeSingle()

  if (fallbackResult.error) {
    throw new Error(`Waitlist lookup failed: ${fallbackResult.error.message}`)
  }

  return fallbackResult.data
    ? { ...fallbackResult.data, flagged: false }
    : null
}

async function updateWaitlistEntryByEmail(
  email: string,
  payload: Record<string, unknown>
): Promise<{ message?: string; code?: string } | null> {
  let currentPayload = payload

  while (true) {
    const { error } = await supabase
      .from("waitlist_entries")
      .update(currentPayload)
      .eq("email", email)

    if (!error) return null

    const strippedPayload = stripUnsupportedWaitlistColumns(currentPayload, error)
    if (!strippedPayload) return error
    currentPayload = strippedPayload
  }
}

async function insertWaitlistRow(
  payload: Record<string, unknown>
): Promise<{
  data: { rank: number; referral_code: string } | null
  error: { message?: string; code?: string } | null
}> {
  let currentPayload = payload

  while (true) {
    const { data, error } = await supabase
      .from("waitlist_entries")
      .insert(currentPayload)
      .select("rank, referral_code")
      .single()

    if (!error) {
      return { data, error: null }
    }

    const strippedPayload = stripUnsupportedWaitlistColumns(currentPayload, error)
    if (!strippedPayload) {
      return { data: null, error }
    }
    currentPayload = strippedPayload
  }
}

export async function insertWaitlistEntry(entry: WaitlistInsert): Promise<WaitlistResult> {
  const email = entry.email.toLowerCase().trim()
  const db = supabase
  const existing = await getExistingWaitlistEntry(email)

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

    const updatePayload: Record<string, unknown> = {
      wallet_address: nextWallet,
      primary_branch: nextBranch,
      flagged:        nextFlagged,
    }

    // Include twitter fields if provided
    if (entry.twitter_handle) {
      updatePayload.twitter_handle = entry.twitter_handle
      updatePayload.twitter_score_data = entry.twitter_score_data ?? null
      updatePayload.twitter_connected_at = new Date().toISOString()
    }

    const upErr = await updateWaitlistEntryByEmail(email, updatePayload)

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

  const { data, error } = await insertWaitlistRow({ ...basePayload, ...twitterPayload })

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
  const normalizedEmail = email.toLowerCase().trim()
  const { data, error } = await supabase
    .from("waitlist_entries")
    .select("approved, rank")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (error && isMissingColumnError(error, "approved")) {
    const fallback = await supabase
      .from("waitlist_entries")
      .select("rank")
      .eq("email", normalizedEmail)
      .maybeSingle()

    if (!fallback.data) return { exists: false, approved: false, rank: null }
    return { exists: true, approved: false, rank: fallback.data.rank ?? null }
  }

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
