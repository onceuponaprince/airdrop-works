from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .service import get_or_create_referral_code, get_leaderboard
from .models import Referral


class MyReferralView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ref = get_or_create_referral_code(request.user)
        return Response({
            "code": ref.code,
            "referrals": Referral.objects.filter(referrer=request.user, referred__isnull=False).count(),
        })


class ReferralLeaderboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        top = get_leaderboard()
        data = [
            {
                "wallet": u.wallet_address,
                "count": u.referral_count,
            }
            for u in top
        ]
        return Response(data)