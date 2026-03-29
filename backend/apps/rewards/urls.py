from django.urls import path
from . import views

urlpatterns = [
    path("loot/", views.LootChestListView.as_view(), name="loot_list"),
    path("loot/<uuid:pk>/open/", views.LootChestOpenView.as_view(), name="loot_open"),
    path("badges/", views.UserBadgeListView.as_view(), name="badge_list"),
]
