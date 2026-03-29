from django.urls import path
from . import views

urlpatterns = [
    path("demo/", views.JudgeDemoView.as_view(), name="judge_demo"),
]
