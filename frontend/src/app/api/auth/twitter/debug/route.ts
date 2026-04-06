/**
 * GET /api/auth/twitter/debug — Shows the current Twitter OAuth config.
 * Only works in development or when NEXT_PUBLIC_ADMIN_BYPASS is set.
 * Delete this route before going to production.
 */

import { NextResponse } from "next/server"

export async function GET() {
  const bypass = process.env.NEXT_PUBLIC_ADMIN_BYPASS
  if (process.env.NODE_ENV !== "development" && !bypass) {
    return NextResponse.json({ error: "Not available" }, { status: 403 })
  }

  const clientId = process.env.TWITTER_CLIENT_ID ?? "(not set)"
  const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? ""
  const hasSecret = clientSecret.length > 0
  const callbackUrl = process.env.TWITTER_CALLBACK_URL ?? "(not set)"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "(not set)"
  const vercelUrl = process.env.VERCEL_URL ?? "(not set)"

  return NextResponse.json({
    status: "debug",
    config: {
      TWITTER_CLIENT_ID: clientId !== "(not set)" ? clientId.slice(0, 8) + "..." : "(not set)",
      TWITTER_CLIENT_SECRET: hasSecret ? `✓ set (${clientSecret.length} chars)` : "✗ NOT SET — this is why auth fails",
      TWITTER_CALLBACK_URL: callbackUrl,
      NEXT_PUBLIC_SITE_URL: siteUrl,
      VERCEL_URL: vercelUrl,
    },
    checks: {
      clientIdSet: clientId !== "(not set)",
      secretSet: hasSecret,
      callbackUrlSet: callbackUrl !== "(not set)",
      callbackMatchesSite: callbackUrl.startsWith(siteUrl) || callbackUrl.startsWith(`https://${vercelUrl}`),
    },
    fix: hasSecret ? null : "Set TWITTER_CLIENT_SECRET in Vercel → Settings → Environment Variables → then redeploy",
  })
}
