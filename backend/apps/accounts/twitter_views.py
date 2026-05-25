"""Twitter OAuth login/link and watch status."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import TwitterConnection
from apps.accounts.social_login_helpers import (
    frontend_redirect,
    merge_pending_redirect,
    redirect_with_jwt,
    resolve_social_user,
)
from apps.contributions.models import CrawlSourceConfig
from apps.contributions.tasks import sync_twitter_connection_task

from .twitter_oauth import (
    build_authorize_url,
    exchange_code_for_tokens,
    fetch_authenticated_user,
    generate_pkce,
)

logger = logging.getLogger(__name__)

CACHE_PREFIX = "twitter_oauth:"
CACHE_TTL = 600


def _callback_url() -> str:
    return str(
        settings.TWITTER_OAUTH_CALLBACK_URL
        or f"{settings.SITE_URL.rstrip('/')}/api/v1/auth/twitter/callback/"
    )


def _frontend_redirect(path: str = "/sources") -> str:
    return frontend_redirect(path)


class TwitterOAuthStartView(APIView):
    """Begin Twitter OAuth — link (JWT) or login (public)."""

    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.query_params.get("mode", "link")
        if mode == "login":
            redirect_after = request.query_params.get("redirect_uri") or _frontend_redirect("/login")
        else:
            redirect_after = request.query_params.get("redirect_uri") or _frontend_redirect(
                "/sources?twitter=connected"
            )

        user_id = None
        if request.user.is_authenticated:
            user_id = str(request.user.id)
        elif mode != "login":
            return Response(
                {"detail": "Sign in with wallet first or use mode=login"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            state, code_verifier, code_challenge = generate_pkce()
            callback = _callback_url()
            authorize_url = build_authorize_url(
                state=state,
                code_challenge=code_challenge,
                redirect_uri=callback,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        cache.set(
            f"{CACHE_PREFIX}{state}",
            {
                "user_id": user_id,
                "code_verifier": code_verifier,
                "redirect_uri": redirect_after,
                "mode": mode,
            },
            CACHE_TTL,
        )
        return Response({"authorizeUrl": authorize_url, "state": state, "mode": mode})


class TwitterOAuthCallbackView(APIView):
    """OAuth callback — exchange code, persist connection, redirect to frontend."""

    permission_classes = [AllowAny]

    def get(self, request):
        error = request.query_params.get("error")
        if error:
            return HttpResponseRedirect(
                _frontend_redirect(f"/sources?twitter=error&reason={error}")
            )

        code = request.query_params.get("code", "").strip()
        state = request.query_params.get("state", "").strip()
        if not code or not state:
            return HttpResponseRedirect(_frontend_redirect("/sources?twitter=error&reason=missing_code"))

        session = cache.get(f"{CACHE_PREFIX}{state}")
        cache.delete(f"{CACHE_PREFIX}{state}")
        if not session:
            return HttpResponseRedirect(_frontend_redirect("/sources?twitter=error&reason=invalid_state"))

        callback = _callback_url()
        try:
            token_payload = exchange_code_for_tokens(
                code=code,
                code_verifier=session["code_verifier"],
                redirect_uri=callback,
            )
            access_token = token_payload.get("access_token", "")
            refresh_token = token_payload.get("refresh_token", "")
            expires_in = int(token_payload.get("expires_in") or 0)
            twitter_user = fetch_authenticated_user(access_token)
        except ValueError as exc:
            logger.error("[TwitterOAuth] callback failed: %s", exc)
            return HttpResponseRedirect(
                _frontend_redirect("/sources?twitter=error&reason=token_exchange")
            )

        twitter_user_id = str(twitter_user.get("id", "")).strip()
        username = str(twitter_user.get("username", "")).strip().lower()
        if not twitter_user_id or not username:
            return HttpResponseRedirect(_frontend_redirect("/sources?twitter=error&reason=no_user"))

        twitter_email = str(twitter_user.get("email") or "").strip()

        session["provider"] = "twitter"
        provider_payload = {
            "provider": "twitter",
            "twitter_user_id": twitter_user_id,
            "twitter_username": username,
            "display_name": str(twitter_user.get("name") or username),
            "avatar_url": str(twitter_user.get("profile_image_url") or ""),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expires_at": None,
            "watch_enabled": True,
        }
        user, _created = resolve_social_user(
            session,
            connection_model=TwitterConnection,
            platform_id_field="twitter_user_id",
            platform_user_id=twitter_user_id,
            username=username,
            username_prefix="tw",
            display_name=str(twitter_user.get("name") or username),
            avatar_url=str(twitter_user.get("profile_image_url") or ""),
            email=twitter_email,
            provider_payload=provider_payload,
        )

        if session.get("mode") == "login" and session.get("merge_required"):
            return HttpResponseRedirect(merge_pending_redirect(session))

        if user is None:
            return HttpResponseRedirect(_frontend_redirect("/sources?twitter=error&reason=no_user"))

        expires_at = None
        if expires_in:
            expires_at = datetime.now(tz=UTC) + timedelta(seconds=expires_in)
        provider_payload["token_expires_at"] = expires_at

        connection, _ = TwitterConnection.objects.update_or_create(
            twitter_user_id=twitter_user_id,
            defaults={
                "user": user,
                "twitter_username": username,
                "display_name": str(twitter_user.get("name") or username),
                "avatar_url": str(twitter_user.get("profile_image_url") or ""),
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expires_at": expires_at,
                "watch_enabled": True,
                "last_error": "",
            },
        )
        CrawlSourceConfig.objects.update_or_create(
            user=user,
            platform="twitter",
            source_key=username,
            defaults={"is_active": True, "metadata": {"oauth": True, "watch": True}},
        )
        sync_twitter_connection_task.delay(str(connection.id))

        redirect_after = session.get("redirect_uri") or _frontend_redirect("/sources?twitter=connected")
        if session.get("mode") == "login":
            return HttpResponseRedirect(redirect_with_jwt(session, user, default_path="/login"))

        return HttpResponseRedirect(redirect_after)


class TwitterConnectionStatusView(APIView):
    """Linked Twitter account + watch flags."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        conn = TwitterConnection.objects.filter(user=request.user).first()
        if not conn:
            return Response({"connected": False})
        return Response(
            {
                "connected": True,
                "twitterUsername": conn.twitter_username,
                "displayName": conn.display_name,
                "avatarUrl": conn.avatar_url,
                "watchEnabled": conn.watch_enabled,
                "useSeleniumFallback": conn.use_selenium_fallback,
                "lastSyncedAt": conn.last_synced_at,
                "lastError": conn.last_error,
            }
        )

    def patch(self, request):
        conn = TwitterConnection.objects.filter(user=request.user).first()
        if not conn:
            return Response({"detail": "No Twitter account linked"}, status=status.HTTP_404_NOT_FOUND)
        if "watchEnabled" in request.data:
            conn.watch_enabled = bool(request.data["watchEnabled"])
        if "useSeleniumFallback" in request.data:
            conn.use_selenium_fallback = bool(request.data["useSeleniumFallback"])
        conn.save(update_fields=["watch_enabled", "use_selenium_fallback", "updated_at"])
        return self.get(request)

    def delete(self, request):
        conn = TwitterConnection.objects.filter(user=request.user).first()
        if conn:
            conn.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TwitterSyncNowView(APIView):
    """Trigger immediate OAuth timeline sync."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        conn = TwitterConnection.objects.filter(user=request.user).first()
        if not conn:
            return Response({"detail": "Link Twitter first"}, status=status.HTTP_400_BAD_REQUEST)
        task = sync_twitter_connection_task.delay(str(conn.id))
        return Response({"taskId": task.id, "status": "queued"})
