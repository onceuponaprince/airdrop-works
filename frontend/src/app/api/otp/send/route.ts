/**
 * POST /api/otp/send — Generate a 6-digit OTP, hash it, store in Supabase,
 * and email the code via Resend. Uses the service role key (server-only)
 * so the email_otps table stays locked behind RLS for client requests.
 */

import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { randomInt } from "crypto"
import bcrypt from "bcryptjs"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

// Service role client — bypasses RLS. Never expose to the browser.
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// ── Rate limiting (in-memory, per-instance) ──────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 3) return false // 3 sends per minute per IP
  entry.count++
  return true
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Wait a moment and try again." },
      { status: 429 }
    )
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Email verification not configured." },
      { status: 503 }
    )
  }

  let email: string
  try {
    const body = await req.json()
    email = (body.email ?? "").toLowerCase().trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Valid email required")
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    )
  }

  // Generate 6-digit OTP and bcrypt hash it
  const otp = String(randomInt(100000, 999999))
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  // Invalidate any existing unused OTPs for this email
  await supabase
    .from("email_otps")
    .update({ used: true })
    .eq("email", email)
    .eq("used", false)

  // Store new OTP hash
  const { error: insertError } = await supabase.from("email_otps").insert({
    email,
    otp_hash: otpHash,
    expires_at: expiresAt.toISOString(),
  })

  if (insertError) {
    console.error("[OTP] Insert error:", insertError)
    return NextResponse.json(
      { error: "Failed to generate code. Please try again." },
      { status: 500 }
    )
  }

  // Send OTP email via Resend
  if (resend) {
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || "hello@airdrop.works"
    const fromName = process.env.EMAIL_FROM_NAME || "AI(r)Drop"

    try {
      await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: email,
        subject: "Your AI(r)Drop verification code",
        html: buildOtpEmailHtml(otp),
      })
    } catch (err) {
      console.error("[OTP] Email send error:", err)
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      )
    }
  } else {
    // Dev fallback — log to console when Resend is not configured
    console.log(`[OTP] Dev mode — code for ${email}: ${otp}`)
  }

  return NextResponse.json({ ok: true })
}

// ── Email template ───────────────────────────────────────────────────────────

function buildOtpEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0A0B10;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0B10;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;font-family:monospace;font-size:13px;color:#10B981;letter-spacing:0.15em;text-transform:uppercase;">
            AI(r)DROP
          </p>
        </td></tr>
        <tr><td style="background:#13141D;border:1px solid #1F2937;border-radius:6px;padding:40px 32px;">
          <h2 style="margin:0 0 8px;font-family:monospace;font-size:14px;color:#6B7280;letter-spacing:0.2em;text-transform:uppercase;">
            Your verification code
          </h2>
          <p style="margin:0 0 32px;font-size:14px;color:#E8ECF4;line-height:1.6;">
            Enter this code to verify your email. Expires in 30 minutes.
          </p>
          <div style="background:#0A0B10;border:1px solid #1F2937;border-radius:6px;padding:32px;text-align:center;">
            <p style="font-family:monospace;font-size:42px;letter-spacing:0.3em;color:#10B981;margin:0;
                      text-shadow:0 0 20px rgba(16,185,129,0.4);">
              ${otp}
            </p>
          </div>
          <p style="color:#374151;font-size:12px;margin-top:24px;">
            If you didn't request this, ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#6B7280;">
            AI(r)Drop · Airdrops that reward what actually matters
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}
