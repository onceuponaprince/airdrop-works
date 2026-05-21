from django.urls import path
from . import views

urlpatterns = [
    path("demo/", views.JudgeDemoView.as_view(), name="judge_demo"),
    path("demo/marketing/", views.JudgeMarketingDemoView.as_view(), name="judge_marketing_demo"),
    path("score/", views.JudgeScoreView.as_view(), name="judge_score"),
    path("score-account/", views.JudgeScoreAccountView.as_view(), name="judge_score_account"),
    # Open Rubric catalog (Phase 4)
    path("rubrics/", views.RubricCatalogView.as_view(), name="rubric_catalog"),
    path("rubrics/schema/", views.RubricSchemaView.as_view(), name="rubric_schema"),
    path("rubrics/<slug:key>/", views.RubricByKeyView.as_view(), name="rubric_by_key"),
    # Rubric CRUD (Function 5)
    path("rubric/", views.RubricListCreateView.as_view(), name="rubric_list_create"),
    path("rubric/<uuid:pk>/", views.RubricDetailView.as_view(), name="rubric_detail"),
]
