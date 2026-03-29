from django.urls import path
from . import views

urlpatterns = [
    path("", views.QuestListView.as_view(), name="quest_list"),
    path("my/", views.MyQuestsView.as_view(), name="my_quests"),
    path("<uuid:pk>/", views.QuestDetailView.as_view(), name="quest_detail"),
    path("<uuid:pk>/accept/", views.QuestAcceptView.as_view(), name="quest_accept"),
]
