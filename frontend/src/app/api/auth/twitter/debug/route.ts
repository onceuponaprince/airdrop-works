/**
 * GET /api/auth/twitter/debug — Shows the current Twitter OAuth config.
 * Only works in development or when NEXT_PUBLIC_ADMIN_BYPASS is set.
 * Delete this route before going to production.
 */

import { NextRequest, NextResponse } from "next/server"

function getEffectiveCallbackUrl(req: NextRequest): string {
  const configuredCallbackUrl = process.env.TWITTER_CALLBACK_URL ?? ""
  const requestCallbackUrl = `${req.nextUrl.origin}/api/auth/twitter/callback`

  if (!configuredCallbackUrl) {
    return requestCallbackUrl
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      if (new URL(configuredCallbackUrl).origin !== req.nextUrl.origin) {
        return requestCallbackUrl
      }
    } catch {
      return requestCallbackUrl
    }
  }

  return configuredCallbackUrl
}

export async function GET(req: NextRequest) {
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
  const requestOrigin = req.nextUrl.origin
  const effectiveCallbackUrl = getEffectiveCallbackUrl(req)

  return NextResponse.json({
    status: "debug",
    config: {
      TWITTER_CLIENT_ID: clientId !== "(not set)" ? clientId.slice(0, 8) + "..." : "(not set)",
      TWITTER_CLIENT_SECRET: hasSecret ? `✓ set (${clientSecret.length} chars)` : "✗ NOT SET — this is why auth fails",
      TWITTER_CALLBACK_URL: callbackUrl,
      EFFECTIVE_CALLBACK_URL: effectiveCallbackUrl,
      NEXT_PUBLIC_SITE_URL: siteUrl,
      REQUEST_ORIGIN: requestOrigin,
      VERCEL_URL: vercelUrl,
    },
    checks: {
      clientIdSet: clientId !== "(not set)",
      secretSet: hasSecret,
      callbackUrlSet: callbackUrl !== "(not set)",
      callbackMatchesSite:
        effectiveCallbackUrl.startsWith(siteUrl) ||
        effectiveCallbackUrl.startsWith(requestOrigin) ||
        effectiveCallbackUrl.startsWith(`https://${vercelUrl}`),
    },
    fix: !hasSecret
      ? "Set TWITTER_CLIENT_SECRET in Vercel → Settings → Environment Variables → then redeploy"
      : callbackUrl !== "(not set)" && !callbackUrl.startsWith(requestOrigin) && process.env.NODE_ENV !== "production"
        ? "Your local app origin and configured callback differ. The dev route now falls back to the request origin, but your Twitter app must also allow that localhost callback URL."
        : null,
  })
}
