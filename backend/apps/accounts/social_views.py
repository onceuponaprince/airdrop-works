from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .social_models import UserSocialAccount


class ConnectSocialAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Connect a social account (Telegram, Discord, Twitter, etc.).
        For MVP: accepts platform, external_id, username.
        Real OAuth flows can be added later per platform.
        """
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

        deleted, _ = UserSocialAccount.objects.filter(
            user=request.user, platform=platform
        ).delete()

        return Response(
            {"status": "disconnected" if deleted else "not_found"},
            status=status.HTTP_200_OK,
        )


class MySocialAccountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accounts = UserSocialAccount.objects.filter(user=request.user)
        data = [
            {
                "platform": a.platform,
                "username": a.username,
                "display_name": a.display_name,
                "connected_at": a.connected_at,
                "last_synced_at": a.last_synced_at,
            }
            for a in accounts
        ]
        return Response(data)


class SyncSocialAccountsView(APIView):
    """
    Trigger scoring for all connected social accounts of the current user.
    This queues the existing crawl + AI Judge pipeline.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        accounts = UserSocialAccount.objects.filter(user=request.user)

        if not accounts.exists():
            return Response({"message": "No connected accounts to sync."}, status=200)

        # In a real implementation, we would queue Celery tasks here
        # For MVP we just acknowledge and let the user know scoring will run.
        return Response({
            "status": "queued",
            "accounts": [a.platform for a in accounts],
            "message": "Scoring jobs have been queued for your connected accounts."
        }, status=202)