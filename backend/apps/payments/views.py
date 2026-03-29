"""Payments views — Stripe billing automation for tenant plans."""

from __future__ import annotations

import stripe
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.models import Subscription
from apps.payments.serializers import CheckoutSessionSerializer, PortalSessionSerializer
from apps.payments.services import (
    configure_stripe,
    ensure_stripe_customer,
    get_price_id_for_plan,
    sync_subscription_from_checkout_session,
    sync_subscription_from_subscription_payload,
    upsert_subscription,
)
from apps.spore.security.tenancy import has_tenant_admin_role


def tenant_for_billing_request(request, tenant_slug: str):
    membership = (
        request.user.spore_tenant_memberships.select_related("tenant")
        .filter(tenant__slug=tenant_slug, is_active=True, tenant__is_active=True)
        .first()
    )
    if not membership:
        raise PermissionDenied("No active membership for this tenant")
    request.spore_membership_role = membership.role
    if not has_tenant_admin_role(request):
        raise PermissionDenied("Tenant owner/admin role required")
    return membership.tenant


def assert_stripe_configured():
    if not settings.STRIPE_SECRET_KEY:
        raise ValidationError("Stripe is not configured")
    configure_stripe()


class SubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_slug = request.query_params.get("tenant_slug", "").strip()
        queryset = request.user.subscriptions.select_related("tenant").order_by("-updated_at")
        if tenant_slug:
            queryset = queryset.filter(tenant__slug=tenant_slug)
        sub = queryset.first()
        if not sub:
            return Response({"plan": None, "status": "none", "portal_available": False})
        return Response(
            {
                "tenant_slug": sub.tenant.slug if sub.tenant_id else "",
                "plan": sub.plan,
                "status": sub.status,
                "portal_available": bool(sub.stripe_customer_id),
                "cancel_at_period_end": sub.cancel_at_period_end,
                "current_period_end": sub.current_period_end,
            }
        )


class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        assert_stripe_configured()
        serializer = CheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tenant = tenant_for_billing_request(request, data["tenant_slug"])
        price_id = get_price_id_for_plan(data["plan"])
        if not price_id:
            raise ValidationError("No Stripe price configured for this plan")

        subscription = Subscription.objects.filter(tenant=tenant).first()
        if not subscription:
            subscription = upsert_subscription(
                tenant=tenant,
                user=request.user,
                plan=data["plan"],
                status="incomplete",
                metadata={"created_from": "checkout_session"},
            )
        customer_id = ensure_stripe_customer(subscription, tenant, request.user)
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=settings.STRIPE_SUCCESS_URL,
            cancel_url=settings.STRIPE_CANCEL_URL,
            client_reference_id=str(tenant.id),
            metadata={
                "tenant_id": str(tenant.id),
                "tenant_slug": tenant.slug,
                "user_id": str(request.user.id),
                "plan": data["plan"],
            },
            subscription_data={
                "metadata": {
                    "tenant_id": str(tenant.id),
                    "tenant_slug": tenant.slug,
                    "user_id": str(request.user.id),
                    "plan": data["plan"],
                }
            },
        )
        subscription.stripe_checkout_session_id = session["id"]
        subscription.plan = data["plan"]
        subscription.status = "incomplete"
        subscription.save(update_fields=["stripe_checkout_session_id", "plan", "status", "updated_at"])
        return Response(
            {"checkout_url": session["url"], "session_id": session["id"]},
            status=status.HTTP_201_CREATED,
        )


class CreatePortalSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        assert_stripe_configured()
        serializer = PortalSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        tenant = tenant_for_billing_request(request, data["tenant_slug"])
        subscription = Subscription.objects.filter(tenant=tenant).first()
        if not subscription or not subscription.stripe_customer_id:
            raise ValidationError("No Stripe customer found for this tenant")

        session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=settings.STRIPE_SUCCESS_URL,
        )
        return Response({"portal_url": session["url"]}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        assert_stripe_configured()
        payload = request.body
        signature = request.headers.get("Stripe-Signature", "")
        try:
            event = stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=settings.STRIPE_WEBHOOK_SECRET,
            )
        except stripe.error.SignatureVerificationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event["type"]
        event_id = event["id"]
        obj = event["data"]["object"]

        if event_type == "checkout.session.completed":
            sync_subscription_from_checkout_session(obj, event_id=event_id)
        elif event_type in {"customer.subscription.created", "customer.subscription.updated"}:
            sync_subscription_from_subscription_payload(obj, event_id=event_id)
        elif event_type == "customer.subscription.deleted":
            sync_subscription_from_subscription_payload(
                obj,
                event_id=event_id,
                explicit_status="cancelled",
            )
        elif event_type == "invoice.payment_failed":
            sync_subscription_from_subscription_payload(
                {"id": obj.get("subscription", ""), "customer": obj.get("customer", "")},
                event_id=event_id,
                explicit_status="past_due",
            )
        elif event_type == "invoice.paid":
            sync_subscription_from_subscription_payload(
                {"id": obj.get("subscription", ""), "customer": obj.get("customer", "")},
                event_id=event_id,
                explicit_status="active",
            )

        return Response({"received": True}, status=status.HTTP_200_OK)
