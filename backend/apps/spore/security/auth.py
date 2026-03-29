"""Authentication class for SPORE API keys."""

from __future__ import annotations

from django.utils import timezone
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed

from apps.spore.models import SporeApiKey
from apps.spore.security.keys import hash_api_key


class SporeApiKeyAuthentication(authentication.BaseAuthentication):
    keyword = "X-SPORE-API-KEY"

    def authenticate(self, request):
        raw_key = request.headers.get(self.keyword)
        if not raw_key:
            return None

        key_hash = hash_api_key(raw_key.strip())
        api_key = (
            SporeApiKey.objects.select_related("tenant", "created_by")
            .filter(key_hash=key_hash, is_active=True, tenant__is_active=True)
            .first()
        )
        if not api_key:
            raise AuthenticationFailed("Invalid API key")

        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=["last_used_at", "updated_at"])

        request.spore_api_key = api_key
        request.spore_tenant = api_key.tenant
        user = api_key.created_by
        if not user:
            raise AuthenticationFailed("API key owner unavailable")
        return (user, api_key)

