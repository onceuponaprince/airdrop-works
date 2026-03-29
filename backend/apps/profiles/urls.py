from django.urls import path
from . import views

urlpatterns = [
    path("me/", views.MyProfileView.as_view(), name="my_profile"),
    path("me/skill-tree/", views.SkillTreeView.as_view(), name="skill_tree"),
    path("me/skill-tree/unlock/<str:node_id>/", views.SkillTreeView.as_view(), name="skill_tree_unlock"),
    path("<str:wallet_address>/", views.PublicProfileView.as_view(), name="public_profile"),
]
