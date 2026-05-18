from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.contributions.models import Contribution
from apps.leaderboard.models import LeaderboardEntry
from apps.leaderboard.tasks import rebuild_leaderboard
from apps.profiles.models import Profile


class RebuildLeaderboardTaskTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.user_one = User.objects.create(
            username="leaderboard-user-one",
            wallet_address="0x1111111111111111111111111111111111111111",
            is_active=True,
        )
        self.user_two = User.objects.create(
            username="leaderboard-user-two",
            wallet_address="0x2222222222222222222222222222222222222222",
            is_active=True,
        )

        profile_one, _ = Profile.objects.get_or_create(user=self.user_one)
        profile_one.total_xp = 100
        profile_one.educator_xp = 90
        profile_one.builder_xp = 10
        profile_one.creator_xp = 5
        profile_one.scout_xp = 0
        profile_one.diplomat_xp = 3
        profile_one.save()

        profile_two, _ = Profile.objects.get_or_create(user=self.user_two)
        profile_two.total_xp = 80
        profile_two.educator_xp = 20
        profile_two.builder_xp = 80
        profile_two.creator_xp = 10
        profile_two.scout_xp = 50
        profile_two.diplomat_xp = 4
        profile_two.save()

        self._create_contribution(self.user_one, "u1-recent-1", 30, "genuine", days_ago=1)
        self._create_contribution(self.user_one, "u1-recent-2", 20, "ambiguous", days_ago=2)
        self._create_contribution(self.user_one, "u1-monthly-1", 10, "genuine", days_ago=14)

        self._create_contribution(self.user_two, "u2-recent-1", 45, "genuine", days_ago=1)
        self._create_contribution(self.user_two, "u2-recent-farming", 999, "farming", days_ago=1)
        self._create_contribution(self.user_two, "u2-monthly-1", 60, "genuine", days_ago=14)

    def _create_contribution(self, user, platform_content_id, xp_awarded, farming_flag, days_ago):
        Contribution.objects.create(
            user=user,
            platform="twitter",
            platform_content_id=platform_content_id,
            content_text=platform_content_id,
            xp_awarded=xp_awarded,
            farming_flag=farming_flag,
            scored_at=self.now - timedelta(days=days_ago),
        )

    def test_rebuild_leaderboard_creates_global_branch_and_period_snapshots(self):
        rebuild_leaderboard()

        self.assertEqual(LeaderboardEntry.objects.count(), 36)

        global_all_time = LeaderboardEntry.objects.get(user=self.user_one, scope="global", period="all_time")
        builder_all_time = LeaderboardEntry.objects.get(user=self.user_two, scope="builder", period="all_time")
        weekly_global_one = LeaderboardEntry.objects.get(user=self.user_one, scope="global", period="weekly")
        weekly_global_two = LeaderboardEntry.objects.get(user=self.user_two, scope="global", period="weekly")
        monthly_global_one = LeaderboardEntry.objects.get(user=self.user_one, scope="global", period="monthly")
        monthly_global_two = LeaderboardEntry.objects.get(user=self.user_two, scope="global", period="monthly")

        self.assertEqual(global_all_time.rank, 1)
        self.assertEqual(global_all_time.xp, 100)
        self.assertEqual(global_all_time.contribution_count, 3)

        self.assertEqual(builder_all_time.rank, 1)
        self.assertEqual(builder_all_time.xp, 80)

        self.assertEqual(weekly_global_one.rank, 1)
        self.assertEqual(weekly_global_one.xp, 50)
        self.assertEqual(weekly_global_two.rank, 2)
        self.assertEqual(weekly_global_two.xp, 45)

        self.assertEqual(monthly_global_two.rank, 1)
        self.assertEqual(monthly_global_two.xp, 105)
        self.assertEqual(monthly_global_one.rank, 2)
        self.assertEqual(monthly_global_one.xp, 60)

    def test_rebuild_leaderboard_replaces_existing_rows(self):
        LeaderboardEntry.objects.create(
            user=self.user_one,
            scope="global",
            period="all_time",
            rank=99,
            xp=1,
            contribution_count=1,
        )

        rebuild_leaderboard()

        self.assertEqual(LeaderboardEntry.objects.filter(rank=99).count(), 0)
        self.assertEqual(LeaderboardEntry.objects.filter(user=self.user_one, scope="global", period="all_time").count(), 1)