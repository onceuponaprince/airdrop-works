/**
 * Server route: rate-limited POST inserts waitlist row in Supabase and optionally sends Resend confirmation with referral link.
 */

import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { insertWaitlistEntry, buildReferralUrl } from "@/lib/supabase"
import type { WaitlistInsert } from "@/lib/supabase"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Simple in-memory map — replace with Redis/Upstash for production scale
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

// ── Handler ───────────────────────────────────────────────────────────────────

/** Accepts email (+ optional wallet/branch/referral); returns rank, referral code/URL, and `alreadyExists` when duplicate. */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 }
    )
  }

  let body: {
    email?: string
    walletAddress?: string
    primaryBranch?: string
    referralCode?: string
    honeypot?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Honeypot check — the hidden "website" field is invisible to real users.
  // If it has a value, a bot filled it in. Return a fake success so the bot
  // thinks it worked, but don't insert anything into Supabase.
  if (body.honeypot) {
    return NextResponse.json({
      rank: Math.floor(Math.random() * 500) + 100,
      referralCode: "bot-" + Math.random().toString(36).slice(2, 8),
      referralUrl: "https://airdrop.works",
      alreadyExists: false,
    })
  }

  const email = body.email?.toLowerCase().trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 })
  }

  // ── Insert into Supabase ───────────────────────────────────────────────────
  let result
  try {
    const entry: WaitlistInsert = {
      email,
      wallet_address: body.walletAddress || null,
      primary_branch: body.primaryBranch || null,
      referral_code:  body.referralCode  || null,
      source: req.headers.get("referer") || "direct",
    }
    result = await insertWaitlistEntry(entry)
  } catch (err) {
    console.error("[Waitlist API] Supabase error:", err)
    return NextResponse.json(
      { error: "Failed to join waitlist. Please try again." },
      { status: 500 }
    )
  }

  // ── Fire confirmation email (async — don't block response) ─────────────────
  const referralUrl = buildReferralUrl(result.referralCode)
  if (!result.alreadyExists) {
    sendConfirmationEmail(email, result.rank, referralUrl, result.referralCode).catch(
      (err) => console.error("[Waitlist API] Email send error:", err)
    )
  }

  return NextResponse.json({
    rank:          result.rank,
    referralCode:  result.referralCode,
    referralUrl,
    alreadyExists: result.alreadyExists,
  })
}

// ── Email sender ──────────────────────────────────────────────────────────────

async function sendConfirmationEmail(
  email: string,
  rank: number,
  referralUrl: string,
  referralCode: string
) {
  if (!resend) {
    console.warn("[Waitlist API] RESEND_API_KEY not set — skipping confirmation email")
    return
  }

  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "hello@airdrop.works"
  const fromName    = process.env.EMAIL_FROM_NAME    || "AI(r)Drop"

  await resend.emails.send({
    from:    `${fromName} <${fromAddress}>`,
    to:      email,
    subject: `You're on the AI(r)Drop waitlist — Rank #${rank}`,
    html:    buildEmailHtml({ rank, referralUrl, referralCode }),
  })
}

function buildEmailHtml({
  rank,
  referralUrl,
  referralCode,
}: {
  rank: number
  referralUrl: string
  referralCode: string
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're on the AI(r)Drop waitlist</title>
</head>
<body style="margin:0;padding:0;background:#0A0B10;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0B10;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-family:monospace;font-size:13px;color:#10B981;letter-spacing:0.15em;text-transform:uppercase;">
                AI(r)DROP
              </p>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#13141D;border:1px solid #1F2937;border-radius:6px;padding:40px 32px;">

              <p style="margin:0 0 8px;font-family:monospace;font-size:10px;color:#6B7280;letter-spacing:0.2em;text-transform:uppercase;">
                You're in
              </p>

              <h1 style="margin:0 0 24px;font-family:monospace;font-size:42px;color:#10B981;line-height:1;
                         text-shadow:0 0 20px rgba(16,185,129,0.4);">
                #${rank}
              </h1>

              <p style="margin:0 0 24px;font-size:15px;color:#E8ECF4;line-height:1.6;">
                Your waitlist rank is confirmed. We'll notify you when scoring goes live — wallet-connected signups get priority access.
              </p>

              <!-- Demo CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#10B981;border-radius:4px;">
                    <a href="https://airdrop.works/#ai-judge-demo"
                       style="display:inline-block;padding:12px 24px;font-family:monospace;font-size:12px;
                              color:#0A0B10;text-decoration:none;font-weight:600;letter-spacing:0.05em;">
                      Try the AI Judge Demo →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Referral section -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#0A0B10;border:1px solid #1F2937;border-radius:4px;padding:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-family:monospace;font-size:10px;color:#6B7280;
                               letter-spacing:0.2em;text-transform:uppercase;">
                      Move up the list
                    </p>
                    <p style="margin:0 0 12px;font-size:13px;color:#E8ECF4;">
                      Each referral bumps you higher. Share your link:
                    </p>
                    <p style="margin:0 0 8px;font-family:monospace;font-size:12px;color:#6B7280;">
                      Code: ${referralCode}
                    </p>
                    <p style="margin:0;font-family:monospace;font-size:12px;color:#10B981;
                               word-break:break-all;background:#13141D;padding:10px 12px;border-radius:4px;
                               border:1px solid #1F2937;">
                      ${referralUrl}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#6B7280;">
                Built by
                <a href="https://yurika.space" style="color:#A855F7;text-decoration:none;">Yurika</a>.
                Powered by AI that reads.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#6B7280;">
                You're receiving this because you joined the AI(r)Drop waitlist.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
