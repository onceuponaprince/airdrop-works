from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DiscordConnection, TelegramConnection, TwitterConnection
from .social_models import UserSocialAccount


def _account_row(platform, username, display_name, connected_at, last_synced_at=None, *, last_error=None):
    """Build one row for /auth/social/me/ (ISO timestamps serialized by DRF renderer)."""
    row = {
        "platform": platform,
        "username": username or "",
        "display_name": display_name or username or "",
        "connected_at": connected_at,
        "last_synced_at": last_synced_at,
    }
    message = (last_error or "").strip()
    if message:
        row["last_error"] = message[:500]
    return row


class ConnectSocialAccountView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "social_connect"

    def post(self, request):
        """Connect a manually-entered social account for platforms without OAuth."""
        platform = request.data.get("platform")
        external_id = request.data.get("external_id")
        username = request.data.get("username", "")
        display_name = request.data.get("display_name", "")

        if not platform or not external_id:
            return Response(
                {"error": "platform and external_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        account, created = UserSocialAccount.objects.update_or_create(
            user=request.user,
            platform=platform,
            external_id=external_id,
            defaults={
                "username": username,
                "display_name": display_name,
            },
        )

        return Response(
            {
                "status": "connected" if created else "updated",
                "platform": platform,
                "username": account.username,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DisconnectSocialAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        platform = request.data.get("platform")
        if not platform:
            return Response({"error": "platform is required"}, status=400)

        deleted = 0
        generic_deleted, _ = UserSocialAccount.objects.filter(
            user=request.user, platform=platform
        ).delete()
        deleted += generic_deleted

        if platform == "twitter":
            deleted += TwitterConnection.objects.filter(user=request.user).delete()[0]
            try:
                from apps.contributions.models import CrawlSourceConfig

                CrawlSourceConfig.objects.filter(
                    user=request.user, platform="twitter"
                ).delete()
            except Exception:
                pass
        elif platform == "discord":
            deleted += DiscordConnection.objects.filter(user=request.user).delete()[0]
        elif platform == "telegram":
            deleted += TelegramConnection.objects.filter(user=request.user).delete()[0]

        return Response(
            {"status": "disconnected" if deleted else "not_found"},
            status=status.HTTP_200_OK,
        )


class MySocialAccountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = []
        seen_platforms = set()

        twitter = TwitterConnection.objects.filter(user=request.user).first()
        if twitter:
            data.append(_account_row(
                "twitter",
                twitter.twitter_username,
                twitter.display_name,
                twitter.created_at,
                twitter.last_synced_at,
                last_error=twitter.last_error,
            ))
            seen_platforms.add("twitter")

        discord = DiscordConnection.objects.filter(user=request.user).first()
        if discord:
            data.append(_account_row(
                "discord",
                discord.discord_username,
                discord.display_name,
                discord.created_at,
                discord.last_synced_at,
                last_error=discord.last_error,
            ))
            seen_platforms.add("discord")

        telegram = TelegramConnection.objects.filter(user=request.user).first()
        if telegram:
            data.append(_account_row(
                "telegram",
                telegram.telegram_username,
                telegram.display_name,
                telegram.created_at,
                telegram.last_synced_at,
                last_error=telegram.last_error,
            ))
            seen_platforms.add("telegram")

        for account in UserSocialAccount.objects.filter(user=request.user):
            if account.platform in seen_platforms:
                continue
            data.append(_account_row(
                account.platform,
                account.username,
                account.display_name,
                account.connected_at,
                account.last_synced_at,
            ))
            seen_platforms.add(account.platform)

        return Response(data)


class SyncSocialAccountsView(APIView):
    """Trigger scoring for all connected social accounts of the current user."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "social_sync"

    def post(self, request):
        from .social_sync_service import SocialSyncService

        result = SocialSyncService.sync_user_accounts(request.user)

        twitter = TwitterConnection.objects.filter(user=request.user).first()
        if twitter:
            from apps.contributions.tasks import sync_twitter_connection_task

            task = sync_twitter_connection_task.delay(str(twitter.id))
            result["twitter_task_id"] = task.id
            result.setdefault("synced_platforms", [])
            if "twitter" not in result["synced_platforms"]:
                result["synced_platforms"].append("twitter")
                result["synced_platforms"].sort()

        return Response({
            "status": "queued",
            "result": result,
            "message": "Social accounts synced and scoring jobs queued.",
        }, status=202)
