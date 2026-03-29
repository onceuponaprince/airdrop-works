from django.urls import path

from .views import AICoreScoreJobView, AICoreScoreView

urlpatterns = [
    path("score/", AICoreScoreView.as_view(), name="ai_core_score"),
    path("jobs/score/", AICoreScoreJobView.as_view(), name="ai_core_score_job"),
]
