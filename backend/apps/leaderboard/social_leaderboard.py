from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Count, Q
from apps.profiles.models import Profile
from apps.accounts.models import User


class MultiPlatformLeaderboardSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    wallet_address = serializers.CharField(source="user.wallet_address")
    display_name = serializers.CharField(source="user.display_name", allow_blank=True)
    total_xp = serializers.IntegerField(source="total_xp")
    connected_platforms = serializers.ListField(child=serializers.CharField())
    platform_count = serializers.IntegerField()


class MultiPlatformLeaderboardView(generics.GenericAPIView):
    """
    Aggregated leaderboard for the live multi-platform campaign.
    Shows users who have connected at least one social account, ranked by total XP.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        # Get profiles of users who have at least one social account
        profiles = (
            Profile.objects.filter(user__social_accounts__isnull=False)
            .select_related("user")
            .annotate(
                platform_count=Count("user__social_accounts", distinct=True),
                connected_platforms=Count("user__social_accounts__platform", distinct=True),
            )
            .order_by("-total_xp")[:50]
        )

        # Build response with connected platform names
        data = []
        for idx, profile in enumerate(profiles, start=1):
            platforms = list(
                profile.user.social_accounts.values_list("platform", flat=True).distinct()
            )
            data.append({
                "rank": idx,
                "wallet_address": profile.user.wallet_address,
                "display_name": profile.user.display_name or profile.user.wallet_address[:6] + "...",
                "total_xp": profile.total_xp,
                "connected_platforms": platforms,
                "platform_count": len(platforms),
            })

        return Response(data)