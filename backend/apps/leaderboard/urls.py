from django.urls import path
from . import views

urlpatterns = [
    path("global/", views.GlobalLeaderboardView.as_view(), name="leaderboard_global"),
    path("branch/<str:branch>/", views.BranchLeaderboardView.as_view(), name="leaderboard_branch"),
]
