# Add at the bottom of the existing file

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DiscordConnection


class UpdateDiscordChannelsView(APIView):
    """Allow a user to set which Discord channel IDs they want the system to track and score."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        channel_ids = request.data.get("channel_ids", [])
        if not isinstance(channel_ids, list):
            return Response({"detail": "channel_ids must be a list of strings"}, status=400)

        # Clean and dedupe
        clean_ids = [str(cid).strip() for cid in channel_ids if str(cid).strip()]

        conn, _ = DiscordConnection.objects.get_or_create(user=request.user)
        metadata = conn.metadata or {}
        metadata["tracked_channels"] = clean_ids[:20]  # safety cap
        conn.metadata = metadata
        conn.save(update_fields=["metadata", "updated_at"])

        return Response({
            "status": "updated",
            "tracked_channels": clean_ids,
        })