from django.urls import path
from . import views

urlpatterns = [
    path("demo/", views.JudgeDemoView.as_view(), name="judge_demo"),
    path("score/", views.JudgeScoreView.as_view(), name="judge_score"),
    path("score-account/", views.JudgeScoreAccountView.as_view(), name="judge_score_account"),
    # Rubric CRUD (Function 5)
    path("rubric/", views.RubricListCreateView.as_view(), name="rubric_list_create"),
    path("rubric/<uuid:pk>/", views.RubricDetailView.as_view(), name="rubric_detail"),
]
