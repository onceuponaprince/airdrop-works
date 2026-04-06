/**
 * GET /api/auth/twitter — Initiates Twitter OAuth 2.0 PKCE flow.
 *
 * Instead of a 302 redirect (which can fail in popups on some browsers),
 * returns an HTML page that sets cookies via meta tags and redirects
 * via JavaScript. This ensures PKCE cookies are set before navigation.
 */

import { NextResponse } from "next/server"
import { randomBytes, createHash } from "crypto"

export async function GET() {
  const clientId = process.env.TWITTER_CLIENT_ID
  const callbackUrl = process.env.TWITTER_CALLBACK_URL

  if (!clientId || !callbackUrl) {
    return new NextResponse(
      `<html><body><p style="font-family:monospace;color:red;padding:40px;">
        Twitter OAuth not configured. Set TWITTER_CLIENT_ID and TWITTER_CALLBACK_URL.
      </p></body></html>`,
      { status: 503, headers: { "Content-Type": "text/html" } }
    )
  }

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
  const isProduction = process.env.NODE_ENV === "production"
  const secure = isProduction ? "; Secure" : ""

  // Return HTML that sets cookies and redirects — more reliable than
  // NextResponse.redirect() in popup windows across browsers.
  const response = new NextResponse(
    `<!DOCTYPE html>
<html><head><title>Connecting to Twitter...</title></head>
<body>
<script>
  document.cookie = "twitter_code_verifier=${codeVerifier}; path=/; max-age=600; SameSite=Lax${secure}";
  document.cookie = "twitter_oauth_state=${state}; path=/; max-age=600; SameSite=Lax${secure}";
  window.location.href = "${authUrl}";
</script>
<p style="font-family:monospace;color:#6B7280;text-align:center;margin-top:40px;">
  Redirecting to Twitter...
</p>
</body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  )

  return response
}
