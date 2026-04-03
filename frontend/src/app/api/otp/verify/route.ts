/**
 * POST /api/otp/verify — Validate a 6-digit OTP against the bcrypt hash
 * stored in Supabase. On success, marks the OTP as used and updates the
 * waitlist entry's email_status to "verified".
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Verification not configured." },
      { status: 503 }
    )
  }

  let email: string
  let otp: string
  try {
    const body = await req.json()
    email = (body.email ?? "").toLowerCase().trim()
    otp = (body.otp ?? "").trim()
    if (!email || !otp || otp.length !== 6) {
      throw new Error("Email and 6-digit code required")
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    )
  }

  // Fetch the most recent unused, unexpired OTP for this email
  const { data, error: fetchError } = await supabase
    .from("email_otps")
    .select("id, otp_hash, expires_at")
    .eq("email", email)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (fetchError || !data) {
    return NextResponse.json(
      { error: "Code expired or not found. Request a new one." },
      { status: 400 }
    )
  }

  // Compare submitted code against bcrypt hash
  const valid = await bcrypt.compare(otp, data.otp_hash)
  if (!valid) {
    return NextResponse.json(
      { error: "Incorrect code. Please try again." },
      { status: 400 }
    )
  }

  // Mark OTP as used
  await supabase.from("email_otps").update({ used: true }).eq("id", data.id)

  // Mark email as verified on the waitlist entry (if one exists for this email)
  await supabase
    .from("waitlist_entries")
    .update({ email_status: "verified" })
    .eq("email", email)

  return NextResponse.json({ ok: true })
}
