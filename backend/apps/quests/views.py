"""Quest catalog (public) and authenticated acceptance / my-quests listings."""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.filters import OrderingFilter
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, F
from django.utils import timezone
from .models import Quest, QuestAcceptance
from .serializers import QuestSerializer, QuestAcceptanceSerializer, AdminCampaignSerializer


class QuestListView(generics.ListAPIView):
    """Active quests only; optional ``?difficulty=`` filter matches stored codes."""

    serializer_class = QuestSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Quest.objects.filter(status="active")
        difficulty = self.request.query_params.get("difficulty")
        if difficulty:
            qs = qs.filter(difficulty=difficulty)
        return qs


class QuestDetailView(generics.RetrieveAPIView):
    """Single quest by primary key (any status visible; callers often filter client-side)."""

    serializer_class = QuestSerializer
    permission_classes = [AllowAny]
    queryset = Quest.objects.all()


class QuestAcceptView(APIView):
    """Idempotent accept: ``get_or_create`` ``QuestAcceptance`` for active quest."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """201 if new acceptance, 200 if already accepted; body is serialized acceptance."""
        quest = get_object_or_404(Quest, pk=pk, status="active")
        acceptance, created = QuestAcceptance.objects.get_or_create(
            quest=quest, user=request.user
        )
        return Response(
            QuestAcceptanceSerializer(acceptance).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MyQuestsView(generics.ListAPIView):
    """Current user's active quest acceptances (embedded quest payload via serializer)."""

    serializer_class = QuestAcceptanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuestAcceptance.objects.filter(user=self.request.user, status="active")


# Admin Campaign CRUD Endpoints (Function 6)

class AdminCampaignListCreateView(generics.ListCreateAPIView):
    """Admin-only: List all campaigns with filtering/sorting, or create new.
    
    GET query parameters:
    - ?status=active|completed|upcoming - Filter campaigns
    - ?sort_by=created_at|start_date|contributor_count - Sort order (allowlist)
    
    POST body: title, description, difficulty [D|C|B|A|S], rewardPool, rewardToken,
               chain, startDate, endDate, maxParticipants, partySize
    """
    permission_classes = [IsAdminUser]
    serializer_class = AdminCampaignSerializer
    
    def get_queryset(self):
        qs = Quest.objects.all()
        
        # Annotate with contributor stats for sorting/display
        qs = qs.annotate(
            contributor_count=Count('acceptances', distinct=True),
            total_contributions=Count('acceptances__user__contributions', distinct=True),
            avg_score=Avg('acceptances__user__contributions__total_score'),
        )
        
        # Filter by status (param: active, completed, upcoming)
        status_param = self.request.query_params.get('status')
        status_map = {
            'active': 'active',
            'completed': 'completed',
            'upcoming': 'upcoming',
        }
        if status_param in status_map:
            qs = qs.filter(status=status_map[status_param])
        
        # Sort by field (allowlist to prevent injection)
        sort_by = self.request.query_params.get('sort_by', '-created_at')
        allowed_sorts = [
            'created_at', '-created_at',
            'start_date', '-start_date',
            'contributor_count', '-contributor_count',
            'title', '-title',
        ]
        if sort_by in allowed_sorts:
            qs = qs.order_by(sort_by)
        else:
            qs = qs.order_by('-created_at')
        
        return qs
    
    def perform_create(self, serializer):
        """Save new campaign; validation already done by serializer."""
        serializer.save()


class AdminCampaignDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Admin-only: Retrieve, update (PATCH/PUT), or delete a campaign by ID."""
    permission_classes = [IsAdminUser]
    serializer_class = AdminCampaignSerializer
    queryset = Quest.objects.all()
    
    def get_queryset(self):
        """Annotate with contributor stats for responses."""
        qs = super().get_queryset()
        return qs.annotate(
            contributor_count=Count('acceptances', distinct=True),
            total_contributions=Count('acceptances__user__contributions', distinct=True),
            avg_score=Avg('acceptances__user__contributions__total_score'),
        )
