from rest_framework.permissions import BasePermission


class IsOwner(BasePermission):
    """Object-level permission — only the owner can access."""

    def has_object_permission(self, request, view, obj):
        return hasattr(obj, "user") and obj.user == request.user


class IsWalletAuthenticated(BasePermission):
    """Requires user to have a wallet address (Web3-first auth)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.wallet_address
        )


class IsReadOnly(BasePermission):
    """Allow read-only access to anyone."""

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def has_permission(self, request, view):
        return request.method in self.SAFE_METHODS
