"""DRF serializers for the custom user model and wallet login request body.

Response shapes use camelCase aliases (``walletAddress``, etc.) for frontend parity.
"""
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Read-only API representation of ``User`` for auth and profile responses."""
    walletAddress = serializers.CharField(source="wallet_address", read_only=True)  # noqa: N815
    email = serializers.EmailField(read_only=True)
    displayName = serializers.CharField(source="display_name", read_only=True)  # noqa: N815
    avatarUrl = serializers.URLField(source="avatar_url", read_only=True)  # noqa: N815
    shortAddress = serializers.CharField(source="short_address", read_only=True)  # noqa: N815
    isStaff = serializers.BooleanField(source="is_staff", read_only=True)  # noqa: N815
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)  # noqa: N815

    class Meta:
        model = User
        fields = [
            "id", "walletAddress", "email", "displayName",
            "avatarUrl", "shortAddress", "isStaff", "createdAt",
        ]
        read_only_fields = ["id", "createdAt"]


class WalletVerifySerializer(serializers.Serializer):
    """SIWE login body: EVM address, raw SIWE message string, and hex signature."""

    wallet_address = serializers.CharField(max_length=42)
    message = serializers.CharField()
    signature = serializers.CharField()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Mutable profile fields for PATCH ``/auth/me/`` (no wallet change here)."""

    class Meta:
        model = User
        fields = ["display_name", "email", "avatar_url"]
