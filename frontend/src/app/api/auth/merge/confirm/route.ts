/**
 * Email merge confirmation landing route.
 * Proxies token confirmation to Django and redirects to /login with JWT params.
 */

import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:8000").replace(/\/$/, "")
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim()
  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/login?merge=error&reason=missing_token`)
  }

  let payload: {
    access?: string
    refresh?: string
    detail?: string
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/merge/confirm/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    payload = await response.json()
    if (!response.ok) {
      return NextResponse.redirect(`${SITE_URL}/login?merge=error&reason=invalid_token`)
    }
  } catch {
    return NextResponse.redirect(`${SITE_URL}/login?merge=error&reason=backend_unavailable`)
  }

  const params = new URLSearchParams({
    merge: "confirmed",
    access: payload.access || "",
    refresh: payload.refresh || "",
  })
  return NextResponse.redirect(`${SITE_URL}/login?${params.toString()}`)
}
