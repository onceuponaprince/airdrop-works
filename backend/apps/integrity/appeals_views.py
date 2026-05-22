"""Score appeal APIs for contributors and staff."""

from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .appeals_service import (
    AppealValidationError,
    create_contribution_appeal,
    resolve_appeal,
    serialize_appeal,
)
from .models import ScoreAppeal


class AppealCreateView(APIView):
    """POST — submit an appeal for a scored contribution."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        contribution_id = request.data.get("contribution_id") or request.data.get("contributionId")
        reason = request.data.get("reason", "")
        if not contribution_id:
            return Response({"detail": "contribution_id is required."}, status=400)

        try:
            appeal = create_contribution_appeal(
                user=request.user,
                contribution_id=str(contribution_id),
                reason=reason,
            )
        except AppealValidationError as exc:
            return Response({"detail": exc.message, "code": exc.code}, status=400)

        return Response(serialize_appeal(appeal), status=201)


class MyAppealsView(APIView):
    """GET — list appeals filed by the authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        appeals = (
            ScoreAppeal.objects.filter(user=request.user)
            .select_related("contribution")
            .order_by("-created_at")[:50]
        )
        return Response({"results": [serialize_appeal(a) for a in appeals]})


class AppealResolveView(APIView):
    """POST — staff resolves a pending appeal (upheld | rejected)."""

    permission_classes = [IsAdminUser]

    def post(self, request, appeal_id):
        try:
            appeal = ScoreAppeal.objects.select_related("contribution").get(id=appeal_id)
        except ScoreAppeal.DoesNotExist:
            return Response({"detail": "Appeal not found."}, status=404)

        status = (request.data.get("status") or "").strip().lower()
        note = request.data.get("resolution_note") or request.data.get("resolutionNote") or ""

        try:
            appeal = resolve_appeal(appeal, staff_user=request.user, status=status, resolution_note=note)
        except AppealValidationError as exc:
            return Response({"detail": exc.message, "code": exc.code}, status=400)

        return Response(serialize_appeal(appeal))
