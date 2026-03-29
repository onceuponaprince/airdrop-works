from django.test import TestCase

from apps.spore.models import AuditLog, GraphNode, ScoreRun, Tenant, UsageEvent
from apps.spore.services.seeding import seed_spore_scenario


class SporeSeedingTests(TestCase):
    def test_seed_spore_scenario_creates_generated_entries(self):
        result = seed_spore_scenario(
            "seed-tenant",
            tenant_name="Seed Tenant",
            content_per_account=3,
            ambient_accounts=2,
            random_seed=7,
        )

        self.assertEqual(result.tenant_slug, "seed-tenant")
        self.assertGreater(result.nodes_created, 0)
        self.assertGreater(result.score_runs_created, 0)
        self.assertGreater(result.usage_events_created, 0)

        tenant = Tenant.objects.get(slug="seed-tenant")
        self.assertTrue(GraphNode.objects.filter(node_key__startswith="twitter:user:alice_alpha").exists())
        self.assertGreater(ScoreRun.objects.filter(tenant=tenant).count(), 0)
        self.assertGreater(UsageEvent.objects.filter(tenant=tenant).count(), 0)
        self.assertGreater(AuditLog.objects.filter(tenant=tenant).count(), 0)

    def test_seed_campaign_launch_scenario(self):
        result = seed_spore_scenario(
            "campaign-tenant",
            tenant_name="Campaign Tenant",
            scenario="campaign_launch",
            content_per_account=2,
            ambient_accounts=3,
            random_seed=11,
        )

        self.assertEqual(result.scenario, "campaign_launch")
        self.assertTrue(GraphNode.objects.filter(node_key="twitter:user:brand_official").exists())
        self.assertTrue(GraphNode.objects.filter(node_key="twitter:user:founder_voice").exists())
