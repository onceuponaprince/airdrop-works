"""JWT query-string auth for Django Channels WebSockets."""

from __future__ import annotations

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _user_from_token(token: str):
    from django.contrib.auth import get_user_model

    try:
        validated = AccessToken(token)
        user_id = validated.get("user_id")
        if not user_id:
            return AnonymousUser()
        return get_user_model().objects.filter(id=user_id).first() or AnonymousUser()
    except (InvalidToken, TokenError):
        return AnonymousUser()


class JWTAuthMiddleware:
    """Populate scope['user'] from ?token=<access_jwt>."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode())
        token_list = query.get("token") or []
        token = token_list[0] if token_list else ""
        scope["user"] = await _user_from_token(token) if token else AnonymousUser()
        return await self.inner(scope, receive, send)
