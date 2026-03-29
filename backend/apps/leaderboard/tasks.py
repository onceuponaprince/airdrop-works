"""Celery tasks to rebuild leaderboard rankings periodically."""
import logging
from celery import shared_task
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

BRANCH_XP_FIELD_MAP = {
    "educator": "profile__educator_xp",
    "builder": "profile__builder_xp",
    "creator": "profile__creator_xp",
    "scout": "profile__scout_xp",
    "diplomat": "profile__diplomat_xp",
}


@shared_task(name="leaderboard.rebuild_all")
def rebuild_leaderboard():
    """Rebuild all leaderboard snapshots. Runs every 15 minutes via Celery beat."""
    from apps.accounts.models import User
    from apps.contributions.models import Contribution
    from .models import LeaderboardEntry

    logger.info("[Leaderboard] Starting rebuild")

    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    scopes = ["global", "educator", "builder", "creator", "scout", "diplomat"]
    periods = {
        "all_time": None,
        "weekly": week_ago,
        "monthly": month_ago,
    }

    entries_to_create = []

    for scope in scopes:
        xp_field = "profile__total_xp" if scope == "global" else BRANCH_XP_FIELD_MAP[scope]

        for period_name, since in periods.items():
            qs = User.objects.filter(
                is_active=True,
                profile__isnull=False,
            ).select_related("profile")

            if since:
                qs = qs.annotate(
                    period_xp=Sum(
                        "contributions__xp_awarded",
                        filter=Q(
                            contributions__scored_at__gte=since,
                            contributions__farming_flag__in=["genuine", "ambiguous"],
                        ),
                    )
                ).order_by("-period_xp")
            else:
                qs = qs.order_by(f"-{xp_field}")

            for rank, user in enumerate(qs[:1000], start=1):
                xp = (
                    getattr(user, "period_xp", None) or 0
                    if since
                    else getattr(user.profile, xp_field.split("__")[1], 0)
                )
                contrib_count = Contribution.objects.filter(
                    user=user,
                    farming_flag__in=["genuine", "ambiguous"],
                ).count()

                entries_to_create.append(
                    LeaderboardEntry(
                        user=user,
                        scope=scope,
                        period=period_name,
                        rank=rank,
                        xp=xp,
                        contribution_count=contrib_count,
                    )
                )

    with transaction.atomic():
        LeaderboardEntry.objects.all().delete()
        LeaderboardEntry.objects.bulk_create(entries_to_create, batch_size=500)

    logger.info("[Leaderboard] Rebuilt %d entries", len(entries_to_create))
