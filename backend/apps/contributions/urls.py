from django.urls import path
from . import views

urlpatterns = [
    path("", views.ContributionListView.as_view(), name="contribution_list"),
    path("<uuid:pk>/", views.ContributionDetailView.as_view(), name="contribution_detail"),
    path("sources/", views.CrawlSourceConfigListCreateView.as_view(), name="crawl_source_list_create"),
    path("sources/<uuid:pk>/", views.CrawlSourceConfigDetailView.as_view(), name="crawl_source_detail"),
    path("sources/<uuid:pk>/crawl/", views.CrawlSourceConfigRunView.as_view(), name="crawl_source_run"),
    path("crawl/twitter/", views.CrawlTwitterView.as_view(), name="crawl_twitter"),
    path("crawl/reddit/", views.CrawlRedditView.as_view(), name="crawl_reddit"),
    path("crawl/discord/", views.CrawlDiscordView.as_view(), name="crawl_discord"),
    path("crawl/telegram/", views.CrawlTelegramView.as_view(), name="crawl_telegram"),
    path("crawl/all/", views.CrawlAllPlatformsView.as_view(), name="crawl_all_platforms"),
]
