"""DRF serializers for the custom user model and wallet login request body.

Response shapes use camelCase aliases (``walletAddress``, etc.) for frontend parity.
"""
from rest_framework import serializers

from apps.profiles.models import BRANCH_CHOICES, Profile

from .models import User


def _profile_for_user(user: User) -> Profile | None:
    return Profile.objects.filter(user=user).first()


class UserSerializer(serializers.ModelSerializer):
    """Read-only API representation of ``User`` for auth and profile responses."""
    walletAddress = serializers.CharField(source="wallet_address", read_only=True)  # noqa: N815
    email = serializers.EmailField(read_only=True)
    displayName = serializers.CharField(source="display_name", read_only=True)  # noqa: N815
    avatarUrl = serializers.URLField(source="avatar_url", read_only=True)  # noqa: N815
    shortAddress = serializers.CharField(source="short_address", read_only=True)  # noqa: N815
    isStaff = serializers.BooleanField(source="is_staff", read_only=True)  # noqa: N815
    onboardingCompleted = serializers.SerializerMethodField()  # noqa: N815
    preferredBranch = serializers.SerializerMethodField()  # noqa: N815
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)  # noqa: N815

    class Meta:
        model = User
        fields = [
            "id", "walletAddress", "email", "displayName",
            "avatarUrl", "shortAddress", "isStaff",
            "onboardingCompleted", "preferredBranch", "createdAt",
        ]
        read_only_fields = ["id", "createdAt"]

    def get_onboardingCompleted(self, obj: User) -> bool:
        profile = _profile_for_user(obj)
        if profile is not None:
            return profile.onboarding_completed
        return bool(obj.wallet_address)

    def get_preferredBranch(self, obj: User) -> str:
        profile = _profile_for_user(obj)
        return profile.preferred_branch if profile else ""


class WalletVerifySerializer(serializers.Serializer):
    """SIWE login body: EVM address, raw SIWE message string, and hex signature."""

    wallet_address = serializers.CharField(max_length=42)
    message = serializers.CharField()
    signature = serializers.CharField()


class EmailVerifySerializer(serializers.Serializer):
    """Supabase Auth access token after client-side email OTP verification."""

    access_token = serializers.CharField()


class IdentityMergeConfirmSerializer(serializers.Serializer):
    """Single-use merge confirmation token from Resend email link."""

    token = serializers.CharField()


class IdentityMergeInitiateSerializer(serializers.Serializer):
    """Initiate merge when Supabase-verified email matches an existing wallet account."""

    access_token = serializers.CharField()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Mutable profile fields for PATCH ``/auth/me/`` (no wallet change here)."""

    onboarding_completed = serializers.BooleanField(required=False)
    preferred_branch = serializers.ChoiceField(
        choices=[choice[0] for choice in BRANCH_CHOICES],
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = User
        fields = ["display_name", "email", "avatar_url", "onboarding_completed", "preferred_branch"]

    def update(self, instance, validated_data):
        onboarding_completed = validated_data.pop("onboarding_completed", None)
        preferred_branch = validated_data.pop("preferred_branch", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        profile, _ = Profile.objects.get_or_create(user=instance)
        profile_updates: list[str] = []
        if onboarding_completed is not None:
            profile.onboarding_completed = onboarding_completed
            profile_updates.append("onboarding_completed")
        if preferred_branch is not None:
            profile.preferred_branch = preferred_branch
            profile_updates.append("preferred_branch")
        if profile_updates:
            profile_updates.append("updated_at")
            profile.save(update_fields=profile_updates)

        return instance
