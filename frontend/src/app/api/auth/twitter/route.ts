/**
 * GET /api/auth/twitter — Initiates Twitter OAuth 2.0 PKCE flow.
 *
 * Generates a code verifier + challenge, stores the verifier in an httpOnly
 * cookie, and redirects the user to Twitter's authorization page. The callback
 * route exchanges the returned code for an access token.
 */

import { NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"

export async function GET() {
  const clientId = process.env.TWITTER_CLIENT_ID
  const callbackUrl = process.env.TWITTER_CALLBACK_URL

  if (!clientId || !callbackUrl) {
    return NextResponse.json(
      { error: "Twitter OAuth not configured." },
      { status: 503 }
    )
  }

  // Generate PKCE values
  const codeVerifier = randomBytes(32).toString("base64url")
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")

  const state = randomBytes(16).toString("hex")

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: "tweet.read users.read",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  const authUrl = `https://twitter.com/i/oauth2/authorize?${params}`

  const response = NextResponse.redirect(authUrl)

  // Store PKCE verifier and state in httpOnly cookies (10 min TTL)
  response.cookies.set("twitter_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  })
  response.cookies.set("twitter_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
    sameSite: "lax",
  })

  return response
}
