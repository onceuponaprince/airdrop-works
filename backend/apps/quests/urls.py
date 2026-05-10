from django.urls import path
from . import views

urlpatterns = [
    path("", views.QuestListView.as_view(), name="quest_list"),
    path("my/", views.MyQuestsView.as_view(), name="my_quests"),
    path("<uuid:pk>/", views.QuestDetailView.as_view(), name="quest_detail"),
    path("<uuid:pk>/accept/", views.QuestAcceptView.as_view(), name="quest_accept"),
    
    # Admin campaign CRUD (Function 6)
    path("admin/campaigns/", views.AdminCampaignListCreateView.as_view(), name="admin_campaigns_list"),
    path("admin/campaigns/<uuid:pk>/", views.AdminCampaignDetailView.as_view(), name="admin_campaigns_detail"),
]
