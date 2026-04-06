/**
 * POST /api/waitlist/check — Server-side check for existing waitlist email.
 *
 * Runs on the server where the Supabase client has access regardless of
 * RLS policies that may block client-side reads with the anon key.
 */

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ exists: false })
  }

  const { data, error } = await supabase
    .from("waitlist_entries")
    .select("email")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    console.error("[Waitlist Check] Supabase error:", error.message)
    // On error, return false so the user can proceed through OTP normally
    return NextResponse.json({ exists: false })
  }

  return NextResponse.json({ exists: !!data })
}
