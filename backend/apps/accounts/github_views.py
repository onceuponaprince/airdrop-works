"""GitHub OAuth linking and primary login."""

from __future__ import annotations

import logging
import secrets

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.social_login_helpers import frontend_redirect, redirect_with_jwt, resolve_social_user
from apps.accounts.social_models import UserSocialAccount

from .github_oauth import (
    build_github_authorize_url,
    exchange_github_code_for_tokens,
    fetch_github_user,
)

logger = logging.getLogger(__name__)

CACHE_PREFIX = "github_oauth:"
CACHE_TTL = 600


def _callback_url() -> str:
    configured = getattr(settings, "GITHUB_OAUTH_CALLBACK_URL", "")
    if configured:
        return str(configured)
    return f"{settings.SITE_URL.rstrip('/')}/api/v1/auth/github/callback/"


def _frontend_redirect(path: str = "/sources") -> str:
    return frontend_redirect(path)


class GitHubOAuthStartView(APIView):
    """Begin GitHub OAuth — link (JWT) or login (public)."""

    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.query_params.get("mode", "link")
        if mode == "login":
            redirect_after = request.query_params.get("redirect_uri") or _frontend_redirect("/login")
        else:
            redirect_after = request.query_params.get("redirect_uri") or _frontend_redirect(
                "/sources?github=connected"
            )

        user_id = None
        if request.user.is_authenticated:
            user_id = str(request.user.id)
        elif mode != "login":
            return Response(
                {"detail": "Sign in first or use mode=login"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        state = secrets.token_urlsafe(32)
        callback = _callback_url()

        try:
            authorize_url = build_github_authorize_url(
                state=state,
                redirect_uri=callback,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        cache.set(
            f"{CACHE_PREFIX}{state}",
            {
                "user_id": user_id,
                "redirect_uri": redirect_after,
                "mode": mode,
            },
            CACHE_TTL,
        )
        return Response({"authorizeUrl": authorize_url, "state": state, "mode": mode})


class GitHubOAuthCallbackView(APIView):
    """OAuth callback that persists the user's GitHub connection."""

    permission_classes = [AllowAny]

    def get(self, request):
        error = request.query_params.get("error")
        if error:
            return HttpResponseRedirect(
                _frontend_redirect(f"/sources?github=error&reason={error}")
            )

        code = request.query_params.get("code", "").strip()
        state = request.query_params.get("state", "").strip()
        if not code or not state:
            return HttpResponseRedirect(
                _frontend_redirect("/sources?github=error&reason=missing_code")
            )

        session = cache.get(f"{CACHE_PREFIX}{state}")
        cache.delete(f"{CACHE_PREFIX}{state}")
        if not session:
            return HttpResponseRedirect(
                _frontend_redirect("/sources?github=error&reason=invalid_state")
            )

        try:
            token_payload = exchange_github_code_for_tokens(
                code=code,
                redirect_uri=_callback_url(),
            )
            access_token = token_payload.get("access_token", "")
            github_user = fetch_github_user(access_token)
        except ValueError as exc:
            logger.error("[GitHubOAuth] callback failed: %s", exc)
            return HttpResponseRedirect(
                _frontend_redirect("/sources?github=error&reason=token_exchange")
            )

        github_user_id = str(github_user.get("id", "")).strip()
        username = str(github_user.get("login", "")).strip().lower()
        display_name = str(github_user.get("name") or username)
        avatar_url = str(github_user.get("avatar_url") or "")
        if not github_user_id or not username:
            return HttpResponseRedirect(
                _frontend_redirect("/sources?github=error&reason=no_user")
            )

        user, _created = resolve_social_user(
            session,
            connection_model=UserSocialAccount,
            platform_id_field="external_id",
            platform_user_id=github_user_id,
            username=username,
            username_prefix="gh",
            display_name=display_name,
            avatar_url=avatar_url,
            connection_extra_filter={"platform": "github"},
        )

        UserSocialAccount.objects.update_or_create(
            user=user,
            platform="github",
            external_id=github_user_id,
            defaults={
                "username": username,
                "display_name": display_name[:128],
                "avatar_url": avatar_url,
                "access_token": access_token,
            },
        )

        if session.get("mode") == "login":
            session["provider"] = "github"
            return HttpResponseRedirect(redirect_with_jwt(session, user, default_path="/login"))

        redirect_after = session.get("redirect_uri") or _frontend_redirect(
            "/sources?github=connected"
        )
        return HttpResponseRedirect(redirect_after)
