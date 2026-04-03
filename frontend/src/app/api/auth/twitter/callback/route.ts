/**
 * GET /api/auth/twitter/callback — Handles the Twitter OAuth 2.0 PKCE callback.
 *
 * Exchanges the authorization code for an access token, fetches the user's
 * Twitter profile, then redirects back to the waitlist section with the handle
 * and token as query params. The StepTwitter component reads these on mount.
 */

import { NextRequest, NextResponse } from "next/server"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const errorParam = searchParams.get("error")

  const storedState = req.cookies.get("twitter_oauth_state")?.value
  const codeVerifier = req.cookies.get("twitter_code_verifier")?.value

  const clientId = process.env.TWITTER_CLIENT_ID ?? ""
  const callbackUrl = process.env.TWITTER_CALLBACK_URL ?? ""

  // Handle user denying access or any error from Twitter
  if (errorParam) {
    return redirectWithError("twitter_denied")
  }

  // Validate state + code + verifier
  if (!code || !state || state !== storedState || !codeVerifier) {
    return redirectWithError("twitter_auth_failed")
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: callbackUrl,
        code,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error("[Twitter OAuth] Token exchange failed:", tokenRes.status, errBody)
      return redirectWithError("twitter_token_failed")
    }

    const tokenData = await tokenRes.json() as { access_token?: string }
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return redirectWithError("twitter_no_token")
    }

    // Fetch the authenticated user's profile
    const userRes = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!userRes.ok) {
      console.error("[Twitter OAuth] User fetch failed:", userRes.status)
      return redirectWithError("twitter_user_failed")
    }

    const userData = await userRes.json() as {
      data?: { username?: string; name?: string; profile_image_url?: string }
    }
    const handle = userData.data?.username

    if (!handle) {
      return redirectWithError("twitter_no_handle")
    }

    // Redirect back to the waitlist with the handle as a query param.
    // The access token is passed so Phase 4 can use it for scoring
    // with the user's own OAuth credentials (higher rate limits).
    const redirectUrl = new URL(`${SITE_URL}/#waitlist`)
    redirectUrl.searchParams.set("twitter_handle", handle)
    redirectUrl.searchParams.set("twitter_token", accessToken)

    const response = NextResponse.redirect(redirectUrl)
    clearOAuthCookies(response)
    return response
  } catch (err) {
    console.error("[Twitter OAuth] Unexpected error:", err)
    return redirectWithError("twitter_error")
  }
}

function redirectWithError(errorCode: string) {
  const redirectUrl = new URL(`${SITE_URL}/#waitlist`)
  redirectUrl.searchParams.set("twitter_error", errorCode)
  const response = NextResponse.redirect(redirectUrl)
  clearOAuthCookies(response)
  return response
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete("twitter_code_verifier")
  response.cookies.delete("twitter_oauth_state")
}
