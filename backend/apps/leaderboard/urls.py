from django.urls import path
from . import views
from .social_leaderboard import MultiPlatformLeaderboardView

urlpatterns = [
    path("global/", views.GlobalLeaderboardView.as_view(), name="leaderboard_global"),
    path("branch/<str:branch>/", views.BranchLeaderboardView.as_view(), name="leaderboard_branch"),
    path("multi-platform/", MultiPlatformLeaderboardView.as_view(), name="leaderboard_multi_platform"),
]
