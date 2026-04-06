/**
 * GET /api/auth/twitter/callback — Handles the Twitter OAuth 2.0 PKCE callback.
 *
 * Exchanges the authorization code for an access token using HTTP Basic Auth
 * (required for confidential clients / Web App type), fetches the user's
 * Twitter profile, then redirects back to the waitlist with the handle.
 */

import { NextRequest, NextResponse } from "next/server"

function getSiteUrl(): string {
  // Vercel provides this automatically, or fall back to env var / localhost
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000"
  )
}

export async function GET(req: NextRequest) {
  const siteUrl = getSiteUrl()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const errorParam = searchParams.get("error")

  const storedState = req.cookies.get("twitter_oauth_state")?.value
  const codeVerifier = req.cookies.get("twitter_code_verifier")?.value

  const clientId = process.env.TWITTER_CLIENT_ID ?? ""
  const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? ""
  const callbackUrl = process.env.TWITTER_CALLBACK_URL ?? ""

  // Handle user denying access
  if (errorParam) {
    return redirectWithError(siteUrl, "twitter_denied")
  }

  // Validate state + code + verifier
  if (!code || !state || state !== storedState || !codeVerifier) {
    console.error("[Twitter OAuth] State mismatch or missing params", {
      hasCode: !!code,
      stateMatch: state === storedState,
      hasVerifier: !!codeVerifier,
    })
    return redirectWithError(siteUrl, "twitter_auth_failed")
  }

  if (!clientId || !callbackUrl) {
    console.error("[Twitter OAuth] Missing TWITTER_CLIENT_ID or TWITTER_CALLBACK_URL")
    return redirectWithError(siteUrl, "twitter_error")
  }

  try {
    // Twitter OAuth 2.0 token exchange.
    // Confidential clients (Web App type) require HTTP Basic Auth with
    // client_id:client_secret. Public clients (SPA) only need client_id in the body.
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    }

    // Use Basic Auth if client_secret is set (confidential client)
    if (clientSecret) {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      headers["Authorization"] = `Basic ${credentials}`
    }

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: callbackUrl,
      code,
      code_verifier: codeVerifier,
    })

    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers,
      body: tokenBody,
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error("[Twitter OAuth] Token exchange failed:", tokenRes.status, errBody)
      return redirectWithError(siteUrl, "twitter_token_failed")
    }

    const tokenData = await tokenRes.json() as { access_token?: string }
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error("[Twitter OAuth] No access_token in response")
      return redirectWithError(siteUrl, "twitter_no_token")
    }

    // Fetch the authenticated user's profile
    const userRes = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!userRes.ok) {
      const errBody = await userRes.text()
      console.error("[Twitter OAuth] User fetch failed:", userRes.status, errBody)
      return redirectWithError(siteUrl, "twitter_user_failed")
    }

    const userData = await userRes.json() as {
      data?: { username?: string; name?: string; profile_image_url?: string }
    }
    const handle = userData.data?.username

    if (!handle) {
      console.error("[Twitter OAuth] No username in user data")
      return redirectWithError(siteUrl, "twitter_no_handle")
    }

    // Redirect back to waitlist with handle + token as query params
    const redirectUrl = new URL(`${siteUrl}/#waitlist`)
    redirectUrl.searchParams.set("twitter_handle", handle)
    redirectUrl.searchParams.set("twitter_token", accessToken)

    const response = NextResponse.redirect(redirectUrl)
    clearOAuthCookies(response)
    return response
  } catch (err) {
    console.error("[Twitter OAuth] Unexpected error:", err)
    return redirectWithError(siteUrl, "twitter_error")
  }
}

function redirectWithError(siteUrl: string, errorCode: string) {
  const redirectUrl = new URL(`${siteUrl}/#waitlist`)
  redirectUrl.searchParams.set("twitter_error", errorCode)
  const response = NextResponse.redirect(redirectUrl)
  clearOAuthCookies(response)
  return response
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete("twitter_code_verifier")
  response.cookies.delete("twitter_oauth_state")
}
