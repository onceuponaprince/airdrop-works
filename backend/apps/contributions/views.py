"""REST API for user contributions, crawl source CRUD, and one-off crawl triggers.

List/detail views scope strictly to ``request.user``. Crawl endpoints upsert
``CrawlSourceConfig`` and enqueue Celery; Discord/Telegram may fall back to
settings defaults when the client omits channel/chat id.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.conf import settings
from django.db.models import Q
from .models import Contribution
from .serializers import (
    ContributionSerializer,
    AdminContributionSerializer,
    CrawlSourceConfigSerializer,
    DiscordCrawlerRequestSerializer,
    RedditCrawlerRequestSerializer,
    TelegramCrawlerRequestSerializer,
    TwitterCrawlerRequestSerializer,
)
from .tasks import (
    crawl_source_config_task,
    crawl_all_active_sources_task,
)
from .models import CrawlSourceConfig


class ContributionListView(generics.ListAPIView):
    """Paginated list of the authenticated user's contributions (newest first)."""

    serializer_class = ContributionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Contribution.objects.filter(user=self.request.user).order_by("-created_at")


class ContributionDetailView(generics.RetrieveAPIView):
    """Single contribution by id; 404 if it belongs to another user."""

    serializer_class = ContributionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Contribution.objects.filter(user=self.request.user)


class AdminContributionListView(generics.ListAPIView):
    """Admin list of all contributions with filtering by score and farming flag."""

    serializer_class = AdminContributionSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = Contribution.objects.select_related("user").all().order_by("-created_at")

        platform = self.request.query_params.get("platform")
        if platform:
            qs = qs.filter(platform=platform)

        farming_flag = self.request.query_params.get("farming_flag")
        if farming_flag in {"genuine", "farming", "ambiguous"}:
            qs = qs.filter(farming_flag=farming_flag)

        scored = self.request.query_params.get("scored")
        if scored == "true":
            qs = qs.filter(scored_at__isnull=False)
        elif scored == "false":
            qs = qs.filter(scored_at__isnull=True)

        min_score = self.request.query_params.get("min_score")
        if min_score not in {None, ""}:
            qs = qs.filter(total_score__gte=min_score)

        max_score = self.request.query_params.get("max_score")
        if max_score not in {None, ""}:
            qs = qs.filter(total_score__lte=max_score)

        user = self.request.query_params.get("user")
        if user:
            qs = qs.filter(
                Q(user__wallet_address__icontains=user)
                | Q(user__display_name__icontains=user)
                | Q(user__dynamic_user_id__icontains=user)
            )

        sort_by = self.request.query_params.get("sort_by", "-created_at")
        allowed_sort_fields = {
            "created_at",
            "-created_at",
            "scored_at",
            "-scored_at",
            "total_score",
            "-total_score",
            "xp_awarded",
            "-xp_awarded",
        }
        if sort_by in allowed_sort_fields:
            qs = qs.order_by(sort_by)

        return qs


class CrawlSourceConfigListCreateView(generics.ListCreateAPIView):
    """List or create per-user crawl sources (platform + source_key + cursor metadata)."""

    serializer_class = CrawlSourceConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CrawlSourceConfig.objects.filter(user=self.request.user).order_by("platform", "source_key")

    def perform_create(self, serializer):
        """Attach ``user=request.user`` on create."""
        serializer.save(user=self.request.user)


class CrawlSourceConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete one crawl config owned by the current user."""

    serializer_class = CrawlSourceConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CrawlSourceConfig.objects.filter(user=self.request.user)


class CrawlSourceConfigRunView(APIView):
    """Manually queue a crawl for one active config (returns Celery ``task_id``)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        source = CrawlSourceConfig.objects.filter(user=request.user, id=pk, is_active=True).first()
        if not source:
            return Response({"detail": "Active source not found"}, status=status.HTTP_404_NOT_FOUND)

        task = crawl_source_config_task.delay(source_config_id=str(source.id))
        return Response({"task_id": task.id, "status": "queued"}, status=status.HTTP_202_ACCEPTED)


class CrawlTwitterView(APIView):
    """Ensure a Twitter ``CrawlSourceConfig`` exists for ``username``, then queue crawl."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TwitterCrawlerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source, _ = CrawlSourceConfig.objects.get_or_create(
            user=request.user,
            platform="twitter",
            source_key=serializer.validated_data["username"].lstrip("@").lower(),
            defaults={"is_active": True},
        )
        if not source.is_active:
            source.is_active = True
            source.save(update_fields=["is_active", "updated_at"])

        task = crawl_source_config_task.delay(source_config_id=str(source.id))

        return Response({"task_id": task.id, "status": "queued"}, status=status.HTTP_202_ACCEPTED)


class CrawlDiscordView(APIView):
    """Crawl a Discord channel; ``channel_id`` or ``DISCORD_CHANNEL_IDS[0]`` required."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DiscordCrawlerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        channel_id = serializer.validated_data.get("channel_id") or (
            settings.DISCORD_CHANNEL_IDS[0] if settings.DISCORD_CHANNEL_IDS else ""
        )
        if not channel_id:
            return Response(
                {"detail": "channel_id is required or DISCORD_CHANNEL_IDS must be configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source, _ = CrawlSourceConfig.objects.get_or_create(
            user=request.user,
            platform="discord",
            source_key=channel_id,
            defaults={"is_active": True},
        )
        if not source.is_active:
            source.is_active = True
            source.save(update_fields=["is_active", "updated_at"])

        task = crawl_source_config_task.delay(source_config_id=str(source.id))

        return Response({"task_id": task.id, "status": "queued"}, status=status.HTTP_202_ACCEPTED)


class CrawlTelegramView(APIView):
    """Crawl a Telegram chat; ``chat_id`` or ``TELEGRAM_CHAT_IDS[0]`` required."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TelegramCrawlerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        chat_id = serializer.validated_data.get("chat_id") or (
            settings.TELEGRAM_CHAT_IDS[0] if settings.TELEGRAM_CHAT_IDS else ""
        )
        if not chat_id:
            return Response(
                {"detail": "chat_id is required or TELEGRAM_CHAT_IDS must be configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source, _ = CrawlSourceConfig.objects.get_or_create(
            user=request.user,
            platform="telegram",
            source_key=chat_id,
            defaults={"is_active": True},
        )
        if not source.is_active:
            source.is_active = True
            source.save(update_fields=["is_active", "updated_at"])

        task = crawl_source_config_task.delay(source_config_id=str(source.id))

        return Response({"task_id": task.id, "status": "queued"}, status=status.HTTP_202_ACCEPTED)


class CrawlRedditView(APIView):
    """Ensure Reddit config for ``subreddit``, reactivate if needed, queue crawl."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RedditCrawlerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source, _ = CrawlSourceConfig.objects.get_or_create(
            user=request.user,
            platform="reddit",
            source_key=serializer.validated_data["subreddit"],
            defaults={"is_active": True},
        )
        if not source.is_active:
            source.is_active = True
            source.save(update_fields=["is_active", "updated_at"])

        task = crawl_source_config_task.delay(source_config_id=str(source.id))

        return Response({"task_id": task.id, "status": "queued"}, status=status.HTTP_202_ACCEPTED)


class CrawlAllPlatformsView(APIView):
    """Queue ``crawl_source_config_task`` for every active source belonging to the user."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        task = crawl_all_active_sources_task.delay(user_id=str(request.user.id))
        return Response({"task_id": task.id, "status": "queued"}, status=status.HTTP_202_ACCEPTED)
