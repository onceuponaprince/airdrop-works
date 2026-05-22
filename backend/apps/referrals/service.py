import secrets
import string
from django.utils import timezone
from .models import Referral
from apps.accounts.models import User


def generate_referral_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def get_or_create_referral_code(user: User) -> Referral:
    existing = Referral.objects.filter(referrer=user, referred__isnull=True).first()
    if existing:
        return existing
    code = generate_referral_code()
    while Referral.objects.filter(code=code).exists():
        code = generate_referral_code()
    return Referral.objects.create(referrer=user, code=code, source="inapp")


def record_referral_conversion(referred_user: User, code: str) -> Referral | None:
    ref = Referral.objects.filter(code=code, referred__isnull=True).first()
    if not ref:
        return None
    ref.referred = referred_user
    ref.converted_at = timezone.now()
    ref.save(update_fields=["referred", "converted_at", "updated_at"])
    return ref


def get_leaderboard(limit: int = 20):
    from django.db.models import Count
    return (
        User.objects.annotate(referral_count=Count("referrals_made"))
        .filter(referral_count__gt=0)
        .order_by("-referral_count")[:limit]
    )