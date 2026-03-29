"""Profile read APIs: authenticated ``me``, public by wallet, and skill tree state."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Profile
from .serializers import ProfileSerializer
from apps.accounts.models import User


class MyProfileView(APIView):
    """Ensure a ``Profile`` row exists and return full serialized profile for the user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """``get_or_create`` profile then ``ProfileSerializer``."""
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response(ProfileSerializer(profile).data)


class PublicProfileView(APIView):
    """Resolve user by normalized ``wallet_address``; 404 if user or profile missing."""

    permission_classes = [AllowAny]

    def get(self, request, wallet_address):
        """Public character sheet JSON (same serializer shape as ``MyProfileView``)."""
        user = get_object_or_404(User, wallet_address=wallet_address.lower())
        profile = get_object_or_404(Profile, user=user)
        return Response(ProfileSerializer(profile).data)


class SkillTreeView(APIView):
    """Skill tree state: GET returns JSON map; POST unlocks ``node_id`` if new."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return ``{ skillTreeState: { nodeId: iso8601 } }``."""
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response({"skillTreeState": profile.skill_tree_state})

    def post(self, request, node_id):
        """Unlock: 400 if ``node_id`` already in ``skill_tree_state``; else stamp ISO time."""
        from django.utils import timezone
        profile, _ = Profile.objects.get_or_create(user=request.user)

        if node_id in profile.skill_tree_state:
            return Response({"detail": "Node already unlocked"}, status=status.HTTP_400_BAD_REQUEST)

        profile.skill_tree_state[node_id] = timezone.now().isoformat()
        profile.save(update_fields=["skill_tree_state", "updated_at"])
        return Response({"skillTreeState": profile.skill_tree_state})
