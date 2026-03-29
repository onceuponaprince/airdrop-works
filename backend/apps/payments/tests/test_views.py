from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.payments.models import Subscription
from apps.payments.services import PLAN_QUOTAS
from apps.spore.models import Tenant, TenantMembership


@override_settings(
    STRIPE_SECRET_KEY="sk_test_123",
    STRIPE_WEBHOOK_SECRET="whsec_123",
    STRIPE_PRICE_STARTER="price_starter",
    STRIPE_PRICE_GROWTH="price_growth",
    STRIPE_PRICE_ENTERPRISE="price_enterprise",
    STRIPE_SUCCESS_URL="http://localhost:3000/settings?billing=success",
    STRIPE_CANCEL_URL="http://localhost:3000/settings?billing=cancelled",
)
class PaymentsViewsTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="billing-user",
            wallet_address="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            email="billing@example.com",
            is_active=True,
        )
        self.viewer = user_model.objects.create(
            username="viewer-user",
            wallet_address="0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            is_active=True,
        )
        self.tenant = Tenant.objects.create(slug="billing-tenant", name="Billing Tenant", plan="starter")
        TenantMembership.objects.create(tenant=self.tenant, user=self.user, role="owner", is_active=True)
        TenantMembership.objects.create(tenant=self.tenant, user=self.viewer, role="viewer", is_active=True)
        self.client.force_authenticate(user=self.user)

    @patch("apps.payments.views.stripe.checkout.Session.create")
    @patch("apps.payments.services.stripe.Customer.create")
    def test_create_checkout_session(self, customer_create, session_create):
        customer_create.return_value = {"id": "cus_123"}
        session_create.return_value = {"id": "cs_123", "url": "https://checkout.stripe.test/session"}

        response = self.client.post(
            reverse("create_checkout_session"),
            {"tenant_slug": self.tenant.slug, "plan": "growth"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["session_id"], "cs_123")
        subscription = Subscription.objects.get(tenant=self.tenant)
        self.assertEqual(subscription.stripe_customer_id, "cus_123")
        self.assertEqual(subscription.stripe_checkout_session_id, "cs_123")
        self.assertEqual(subscription.plan, "growth")

    def test_checkout_requires_admin_membership(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.post(
            reverse("create_checkout_session"),
            {"tenant_slug": self.tenant.slug, "plan": "starter"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    @patch("apps.payments.views.stripe.billing_portal.Session.create")
    def test_create_portal_session(self, portal_create):
        Subscription.objects.create(
            tenant=self.tenant,
            user=self.user,
            plan="starter",
            status="active",
            stripe_customer_id="cus_123",
        )
        portal_create.return_value = {"url": "https://billing.stripe.test/portal"}

        response = self.client.post(
            reverse("create_portal_session"),
            {"tenant_slug": self.tenant.slug},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["portal_url"], "https://billing.stripe.test/portal")

    @patch("apps.payments.views.stripe.Webhook.construct_event")
    def test_webhook_syncs_subscription_and_tenant_plan(self, construct_event):
        event = {
            "id": "evt_123",
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "id": "sub_123",
                    "customer": "cus_123",
                    "status": "active",
                    "current_period_start": 1700000000,
                    "current_period_end": 1702592000,
                    "cancel_at_period_end": False,
                    "metadata": {
                        "tenant_id": str(self.tenant.id),
                        "tenant_slug": self.tenant.slug,
                        "plan": "growth",
                    },
                    "items": {
                        "data": [
                            {
                                "id": "si_123",
                                "price": {"id": "price_growth"},
                            }
                        ]
                    },
                }
            },
        }
        construct_event.return_value = event

        response = self.client.post(
            reverse("stripe_webhook"),
            data=b"{}",
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="sig_test",
        )

        self.assertEqual(response.status_code, 200)
        subscription = Subscription.objects.get(tenant=self.tenant)
        self.assertEqual(subscription.stripe_subscription_id, "sub_123")
        self.assertEqual(subscription.plan, "growth")
        self.assertEqual(subscription.status, "active")
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.plan, "growth")
        self.assertEqual(self.tenant.quota_daily_query, PLAN_QUOTAS["growth"]["quota_daily_query"])

    @patch("apps.payments.views.stripe.Webhook.construct_event")
    def test_subscription_status_view(self, construct_event):
        construct_event.return_value = {}
        Subscription.objects.create(
            tenant=self.tenant,
            user=self.user,
            plan="starter",
            status="active",
            stripe_customer_id="cus_123",
        )

        response = self.client.get(reverse("subscription_status"), {"tenant_slug": self.tenant.slug})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["plan"], "starter")
        self.assertTrue(response.data["portal_available"])
