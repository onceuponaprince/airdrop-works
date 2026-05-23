import { NextResponse } from "next/server"
import { getWaitlistCount } from "@/lib/supabase"

/** Public waitlist size for marketing social proof (uses service role server-side). */
export async function GET() {
  try {
    const count = await getWaitlistCount()
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
