"""Authenticated loot chest listing/opening and badge inventory."""
import random
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import LootChest, UserBadge
from .serializers import LootChestSerializer, UserBadgeSerializer

RARITY_WEIGHTS = {
    "common": 0.50,
    "uncommon": 0.28,
    "rare": 0.14,
    "epic": 0.06,
    "legendary": 0.02,
}


def roll_rarity() -> str:
    """Return a weighted-random rarity key from ``RARITY_WEIGHTS`` (helper; unused here)."""
    rarities = list(RARITY_WEIGHTS.keys())
    weights = list(RARITY_WEIGHTS.values())
    return random.choices(rarities, weights=weights, k=1)[0]


class LootChestListView(generics.ListAPIView):
    """User's chests newest-first (opened and unopened)."""

    serializer_class = LootChestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LootChest.objects.filter(user=self.request.user).order_by("-created_at")


class LootChestOpenView(APIView):
    """Open one unopened chest: random loot_type/name/amount, set ``opened_at``."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """404 if wrong user, missing row, or already opened; returns updated serializer."""
        try:
            chest = LootChest.objects.get(pk=pk, user=request.user, opened=False)
        except LootChest.DoesNotExist:
            return Response(
                {"detail": "Chest not found or already opened."},
                status=status.HTTP_404_NOT_FOUND,
            )

        chest.loot_type = random.choice(["badge", "innovator_token", "multiplier"])
        chest.loot_name = f"{chest.rarity.capitalize()} {chest.loot_type.replace('_', ' ').title()}"
        chest.loot_description = f"A {chest.rarity} reward from the AI(r)Drop loot system."
        chest.loot_amount = {"innovator_token": random.randint(10, 500)}.get(chest.loot_type)
        chest.opened = True
        chest.opened_at = timezone.now()
        chest.save()

        return Response(LootChestSerializer(chest).data)


class UserBadgeListView(generics.ListAPIView):
    """Earned badges for the current user with ``select_related("badge")``."""

    serializer_class = UserBadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserBadge.objects.filter(user=self.request.user).select_related("badge")
