/**
 * GET /api/auth/twitter/callback — Handles the Twitter OAuth 2.0 PKCE callback.
 *
 * When opened in a popup, renders a small HTML page that posts the result
 * back to the opener window via postMessage, then closes itself.
 * When opened as a redirect, falls back to redirecting to /#waitlist.
 */

import { NextRequest, NextResponse } from "next/server"

function getSiteUrl(): string {
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

  if (errorParam) {
    return postResultToOpener(siteUrl, { error: "twitter_denied" })
  }

  if (!code || !state || state !== storedState || !codeVerifier) {
    console.error("[Twitter OAuth] State mismatch or missing params", {
      hasCode: !!code,
      stateMatch: state === storedState,
      hasVerifier: !!codeVerifier,
    })
    return postResultToOpener(siteUrl, { error: "twitter_auth_failed" })
  }

  if (!clientId || !callbackUrl) {
    console.error("[Twitter OAuth] Missing TWITTER_CLIENT_ID or TWITTER_CALLBACK_URL")
    return postResultToOpener(siteUrl, { error: "twitter_error" })
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    }

    if (clientSecret) {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      headers["Authorization"] = `Basic ${credentials}`
    }

    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers,
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
      return postResultToOpener(siteUrl, { error: "twitter_token_failed" })
    }

    const tokenData = await tokenRes.json() as { access_token?: string }
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return postResultToOpener(siteUrl, { error: "twitter_no_token" })
    }

    const userRes = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!userRes.ok) {
      const errBody = await userRes.text()
      console.error("[Twitter OAuth] User fetch failed:", userRes.status, errBody)
      return postResultToOpener(siteUrl, { error: "twitter_user_failed" })
    }

    const userData = await userRes.json() as {
      data?: { username?: string }
    }
    const handle = userData.data?.username

    if (!handle) {
      return postResultToOpener(siteUrl, { error: "twitter_no_handle" })
    }

    return postResultToOpener(siteUrl, { handle, token: accessToken })
  } catch (err) {
    console.error("[Twitter OAuth] Unexpected error:", err)
    return postResultToOpener(siteUrl, { error: "twitter_error" })
  }
}

/**
 * Returns an HTML page that posts the OAuth result to the opener window
 * via postMessage, then closes itself. If there's no opener (direct
 * navigation), falls back to redirecting.
 */
function postResultToOpener(
  siteUrl: string,
  result: { handle?: string; token?: string; error?: string }
) {
  const payload = JSON.stringify({ type: "twitter_oauth_result", ...result })

  // Clear OAuth cookies
  const response = new NextResponse(
    `<!DOCTYPE html>
<html><head><title>Connecting Twitter...</title></head>
<body>
<script>
  var result = ${payload};
  if (window.opener) {
    window.opener.postMessage(result, "${siteUrl}");
    window.close();
  } else {
    // Fallback: redirect if not in a popup
    var url = new URL("${siteUrl}/#waitlist");
    if (result.handle) {
      url.searchParams.set("twitter_handle", result.handle);
      url.searchParams.set("twitter_token", result.token || "");
    }
    if (result.error) {
      url.searchParams.set("twitter_error", result.error);
    }
    window.location.href = url.toString();
  }
</script>
<p style="font-family:monospace;color:#6B7280;text-align:center;margin-top:40px;">
  Connecting your Twitter account...
</p>
</body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  )

  response.cookies.delete("twitter_code_verifier")
  response.cookies.delete("twitter_oauth_state")
  return response
}
