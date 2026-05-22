from django.urls import path

from . import views
from .reputation_views import ReputationExportView, ReputationHistoryView

urlpatterns = [
    path("me/", views.MyProfileView.as_view(), name="my_profile"),
    path("me/skill-tree/", views.SkillTreeView.as_view(), name="skill_tree"),
    path("me/skill-tree/unlock/<str:node_id>/", views.SkillTreeView.as_view(), name="skill_tree_unlock"),
    path(
        "<str:wallet_address>/reputation/history/",
        ReputationHistoryView.as_view(),
        name="reputation_history",
    ),
    path(
        "<str:wallet_address>/reputation/export/",
        ReputationExportView.as_view(),
        name="reputation_export",
    ),
    path("<str:wallet_address>/", views.PublicProfileView.as_view(), name="public_profile"),
]
