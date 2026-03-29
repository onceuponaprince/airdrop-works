from django.urls import path

from . import views

urlpatterns = [
    path("subscription/", views.SubscriptionStatusView.as_view(), name="subscription_status"),
    path(
        "create-checkout-session/",
        views.CreateCheckoutSessionView.as_view(),
        name="create_checkout_session",
    ),
    path(
        "create-portal-session/",
        views.CreatePortalSessionView.as_view(),
        name="create_portal_session",
    ),
    path("webhook/", views.StripeWebhookView.as_view(), name="stripe_webhook"),
]
