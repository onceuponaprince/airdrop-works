"""Quest catalog (public) and authenticated acceptance / my-quests listings."""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from .models import Quest, QuestAcceptance
from .serializers import QuestSerializer, QuestAcceptanceSerializer


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
