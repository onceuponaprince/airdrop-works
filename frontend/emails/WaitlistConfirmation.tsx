/**
 * AI(r)Drop Waitlist Confirmation Email
 *
 * This is the React Email compatible template.
 * The raw HTML version used by the API route lives in
 * src/app/api/waitlist/route.ts (buildEmailHtml).
 *
 * To preview: npx react-email dev
 * To render: import { render } from "@react-email/render"
 */

interface WaitlistConfirmationProps {
  rank:         number
  referralUrl:  string
  referralCode: string
}

export function WaitlistConfirmation({
  rank,
  referralUrl,
  referralCode,
}: WaitlistConfirmationProps) {
  return (
    <html lang="en">
      <body style={styles.body}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={styles.outer}>
          <tr>
            <td align="center">
              <table width="100%" cellPadding={0} cellSpacing={0} style={styles.container}>

                {/* Logo */}
                <tr>
                  <td style={styles.logoCell}>
                    <p style={styles.logo}>AI(r)DROP</p>
                  </td>
                </tr>

                {/* Main card */}
                <tr>
                  <td style={styles.card}>

                    <p style={styles.overline}>You&apos;re in</p>

                    <table cellPadding={0} cellSpacing={0} style={{ marginBottom: 24 }}>
                      <tr>
                        <td>
                          <p style={styles.rankLabel}>Waitlist Rank</p>
                          <p style={styles.rank}>#{rank}</p>
                        </td>
                      </tr>
                    </table>

                    <p style={styles.body_text}>
                      Your rank is confirmed. We&apos;ll notify you when scoring goes live.
                      Wallet-connected signups get priority access.
                    </p>

                    {/* CTA */}
                    <table cellPadding={0} cellSpacing={0} style={{ marginBottom: 32 }}>
                      <tr>
                        <td style={styles.ctaCell}>
                          <a href="https://airdrop.works/#ai-judge-demo" style={styles.cta}>
                            Try the AI Judge Demo →
                          </a>
                        </td>
                      </tr>
                    </table>

                    {/* Referral */}
                    <table width="100%" cellPadding={0} cellSpacing={0} style={styles.referralBox}>
                      <tr>
                        <td>
                          <p style={styles.referralLabel}>Move up the list</p>
                          <p style={styles.referralText}>Each referral bumps you higher:</p>
                          <p style={styles.referralCode}>Code: {referralCode}</p>
                          <p style={styles.referralUrl}>{referralUrl}</p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={styles.footer}>
                    <p style={styles.footerText}>
                      Built by{" "}
                      <a href="https://yurika.space" style={styles.footerLink}>Yurika</a>.
                      Powered by AI that reads.
                    </p>
                    <p style={styles.footerText}>
                      You&apos;re receiving this because you joined the AI(r)Drop waitlist.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}

const styles: Record<string, React.CSSProperties> = {
  body:         { margin: 0, padding: 0, backgroundColor: "#0A0B10" },
  outer:        { backgroundColor: "#0A0B10", padding: "40px 16px" },
  container:    { maxWidth: 560 },
  logoCell:     { paddingBottom: 32 },
  logo:         { margin: 0, fontFamily: "monospace", fontSize: 13, color: "#10B981", letterSpacing: "0.15em", textTransform: "uppercase" },
  card:         { backgroundColor: "#13141D", border: "1px solid #1F2937", borderRadius: 6, padding: "40px 32px" },
  overline:     { margin: "0 0 8px", fontFamily: "monospace", fontSize: 10, color: "#6B7280", letterSpacing: "0.2em", textTransform: "uppercase" },
  rankLabel:    { margin: "0 0 4px", fontFamily: "monospace", fontSize: 11, color: "#6B7280" },
  rank:         { margin: 0, fontFamily: "monospace", fontSize: 48, color: "#10B981", lineHeight: "1" },
  body_text:    { margin: "0 0 24px", fontSize: 15, color: "#E8ECF4", lineHeight: "1.6", fontFamily: "Helvetica, Arial, sans-serif" },
  ctaCell:      { backgroundColor: "#10B981", borderRadius: 4 },
  cta:          { display: "inline-block", padding: "12px 24px", fontFamily: "monospace", fontSize: 12, color: "#0A0B10", textDecoration: "none", fontWeight: 600, letterSpacing: "0.05em" },
  referralBox:  { backgroundColor: "#0A0B10", border: "1px solid #1F2937", borderRadius: 4, padding: 20 },
  referralLabel:{ margin: "0 0 8px", fontFamily: "monospace", fontSize: 10, color: "#6B7280", letterSpacing: "0.2em", textTransform: "uppercase" },
  referralText: { margin: "0 0 12px", fontSize: 13, color: "#E8ECF4", fontFamily: "Helvetica, Arial, sans-serif" },
  referralCode: { margin: "0 0 8px", fontSize: 12, color: "#6B7280", fontFamily: "monospace" },
  referralUrl:  { margin: 0, fontFamily: "monospace", fontSize: 12, color: "#10B981", wordBreak: "break-all", backgroundColor: "#13141D", padding: "10px 12px", borderRadius: 4, border: "1px solid #1F2937" },
  footer:       { paddingTop: 24, textAlign: "center" },
  footerText:   { margin: "0 0 4px", fontSize: 11, color: "#6B7280", fontFamily: "Helvetica, Arial, sans-serif" },
  footerLink:   { color: "#A855F7", textDecoration: "none" },
}

export default WaitlistConfirmation
