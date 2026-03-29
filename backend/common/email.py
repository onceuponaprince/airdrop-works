"""Resend email integration for AI(r)Drop."""
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_email(
    to: str | list[str],
    subject: str,
    html: str,
    from_email: str | None = None,
) -> bool:
    """Send a transactional email via Resend. Returns True on success."""
    if not settings.RESEND_API_KEY:
        logger.warning("[Email] RESEND_API_KEY not configured — skipping send to %s", to)
        return False

    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": from_email or settings.DEFAULT_FROM_EMAIL,
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as exc:
        logger.error("[Email] Failed to send email to %s: %s", to, exc)
        return False


def send_waitlist_confirmation(email: str, rank: int) -> bool:
    """Send waitlist confirmation email."""
    html = f"""
    <div style="font-family: monospace; background: #0A0B10; color: #E8ECF4; padding: 40px; max-width: 600px;">
        <h1 style="color: #10B981; font-size: 18px;">AI(r)DROP</h1>
        <h2 style="color: #E8ECF4;">You're on the list.</h2>
        <p style="color: #6B7280;">Waitlist rank: <span style="color: #10B981; font-size: 24px;">#{rank}</span></p>
        <p style="color: #6B7280;">
            We'll notify you when scoring goes live. In the meantime, try the
            <a href="https://airdrop.works/#ai-judge-demo" style="color: #10B981;">AI Judge demo</a>.
        </p>
        <hr style="border-color: #1F2937; margin: 24px 0;" />
        <p style="color: #6B7280; font-size: 12px;">
            Built by <a href="https://yurika.space" style="color: #A855F7;">Yurika</a>.
            Airdrops reward the wrong people. We fixed that.
        </p>
    </div>
    """
    return send_email(
        to=email,
        subject=f"You're on the AI(r)Drop waitlist — Rank #{rank}",
        html=html,
    )
