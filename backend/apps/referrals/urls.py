from django.urls import path
from .views import MyReferralView, ReferralLeaderboardView

urlpatterns = [
    path("me/", MyReferralView.as_view(), name="referrals_me"),
    path("leaderboard/", ReferralLeaderboardView.as_view(), name="referrals_leaderboard"),
]