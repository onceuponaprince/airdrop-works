from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.contributions.models import Contribution
from apps.payments.models import Subscription
from apps.profiles.models import Profile
from apps.spore.models import AuditLog, Tenant, TenantMembership, UsageEvent


class AccountDataRightsTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="export-user",
            wallet_address="0x1234512345123451234512345123451234512345",
            email="export@example.com",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

        self.tenant = Tenant.objects.create(slug="export-tenant", name="Export Tenant")
        TenantMembership.objects.create(tenant=self.tenant, user=self.user, role="owner", is_active=True)
        Profile.objects.create(user=self.user, total_xp=100, educator_xp=80)
        Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="export contribution",
            content_url="https://x.com/test/status/1",
            platform_content_id="1",
            total_score=75,
            xp_awarded=50,
        )
        Subscription.objects.create(
            tenant=self.tenant,
            user=self.user,
            plan="starter",
            status="active",
            stripe_customer_id="cus_export",
        )
        UsageEvent.objects.create(
            tenant=self.tenant,
            user=self.user,
            metric="spore.query",
            units=1,
            status_code=200,
            metadata={"seed": False},
        )
        AuditLog.objects.create(
            tenant=self.tenant,
            user=self.user,
            action="spore.query",
            target_type="query",
            target_id="abc123",
            metadata={"seed": False},
        )

    def test_user_data_export(self):
        response = self.client.get(reverse("user_data_export"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"]["walletAddress"], self.user.wallet_address)
        self.assertEqual(len(response.data["contributions"]), 1)
        self.assertEqual(len(response.data["memberships"]), 1)
        self.assertEqual(len(response.data["subscriptions"]), 1)
        self.assertEqual(len(response.data["spore"]["usage_events"]), 1)
        self.assertEqual(len(response.data["spore"]["audit_logs"]), 1)

    def test_user_delete_is_idempotent(self):
        response = self.client.delete(reverse("user_delete"))
        self.assertEqual(response.status_code, 204)
        self.assertFalse(get_user_model().objects.filter(id=self.user.id).exists())

        second_response = self.client.delete(reverse("user_delete"))
        self.assertEqual(second_response.status_code, 204)
