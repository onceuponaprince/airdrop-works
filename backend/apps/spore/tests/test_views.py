from unittest import mock

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.spore.models import GraphNode, GraphQueryRun, ScoreRun, Tenant, TenantMembership
from apps.spore.security.keys import hash_api_key


class SporeViewsTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="spore-user",
            wallet_address="0x9999999999999999999999999999999999999999",
            is_active=True,
        )
        self.other_user = user_model.objects.create(
            username="spore-other",
            wallet_address="0x8888888888888888888888888888888888888888",
            is_active=True,
        )
        self.tenant = Tenant.objects.create(slug="tenant-a", name="Tenant A", plan="starter")
        self.other_tenant = Tenant.objects.create(slug="tenant-b", name="Tenant B", plan="starter")
        TenantMembership.objects.create(tenant=self.tenant, user=self.user, role="owner", is_active=True)
        TenantMembership.objects.create(
            tenant=self.other_tenant, user=self.other_user, role="owner", is_active=True
        )
        self.client.force_authenticate(user=self.user)

    @override_settings(
        SPORE_QDRANT_ENABLED=False,
        CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    )
    def test_ingest_and_query(self):
        ingest_response = self.client.post(
            reverse("spore_ingest"),
            {
                "source_platform": "manual",
                "external_id": "seed-1",
                "text": "Graph retrieval is useful for recommendation ranking.",
                "metadata": {"source": "test"},
            },
            format="json",
        )
        self.assertEqual(ingest_response.status_code, 201)
        self.assertEqual(GraphNode.objects.count(), 1)

        query_response = self.client.post(
            reverse("spore_query"),
            {"query_text": "recommendation ranking", "top_k": 5, "hops": 2, "damping": 0.7},
            format="json",
        )
        self.assertEqual(query_response.status_code, 200)
        self.assertTrue(len(query_response.data["results"]) >= 1)

    def test_relationship_summary(self):
        response = self.client.get(
            reverse("spore_twitter_relationship"),
            {"account_a": "alice", "account_b": "bob", "days": 30},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("features", response.data)
        self.assertEqual(response.data["account_a"], "alice")
        self.assertEqual(response.data["account_b"], "bob")

    def test_ops_summary_and_score_runs(self):
        run = ScoreRun.objects.create(
            tenant=self.tenant,
            user=self.user,
            contribution_id="contrib-1",
            source_platform="twitter",
            score_version="spore-v1",
            context={"subject_key": "contribution:contrib-1"},
            variable_scores={"text_composite": 65.0},
            explainability={"graph": "test"},
            confidence=0.77,
            final_score=68,
        )

        summary_response = self.client.get(reverse("spore_ops_summary"))
        self.assertEqual(summary_response.status_code, 200)
        self.assertIn("nodes_total", summary_response.data)
        self.assertIn("score_runs_total", summary_response.data)
        self.assertGreaterEqual(summary_response.data["score_runs_total"], 1)

        score_runs_response = self.client.get(reverse("spore_ops_score_runs"), {"limit": 5})
        self.assertEqual(score_runs_response.status_code, 200)
        self.assertIn("results", score_runs_response.data)
        self.assertGreaterEqual(len(score_runs_response.data["results"]), 1)

        detail_response = self.client.get(
            reverse("spore_ops_score_run_detail", kwargs={"pk": run.id})
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data["id"], str(run.id))

        other_run = ScoreRun.objects.create(
            tenant=self.other_tenant,
            user=self.other_user,
            contribution_id="contrib-other",
            source_platform="twitter",
            score_version="spore-v1",
            context={},
            variable_scores={},
            explainability={},
            confidence=0.5,
            final_score=10,
        )
        blocked_detail = self.client.get(
            reverse("spore_ops_score_run_detail", kwargs={"pk": other_run.id})
        )
        self.assertEqual(blocked_detail.status_code, 404)

    @override_settings(
        SPORE_QDRANT_ENABLED=False,
        CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    )
    def test_query_and_relationship_history_endpoints(self):
        self.client.post(
            reverse("spore_ingest"),
            {
                "source_platform": "manual",
                "external_id": "seed-2",
                "text": "history test content",
            },
            format="json",
        )
        self.client.post(
            reverse("spore_query"),
            {"query_text": "history", "top_k": 5, "hops": 2, "damping": 0.7},
            format="json",
        )
        self.client.get(
            reverse("spore_twitter_relationship"),
            {"account_a": "@alice", "account_b": "@bob", "days": 14},
        )

        query_runs = self.client.get(reverse("spore_ops_query_runs"), {"query_search": "history"})
        self.assertEqual(query_runs.status_code, 200)
        self.assertGreaterEqual(query_runs.data["count"], 1)
        stored = GraphQueryRun.objects.filter(user=self.user).order_by("-created_at").first()
        self.assertIsNotNone(stored)
        first_result = stored.results[0]
        self.assertIn("node_key", first_result)
        self.assertNotIn("node", first_result)

        relationship_runs = self.client.get(
            reverse("spore_ops_relationship_runs"),
            {"account_a": "alice", "account_b": "bob"},
        )
        self.assertEqual(relationship_runs.status_code, 200)
        self.assertGreaterEqual(relationship_runs.data["count"], 1)

        usage_events = self.client.get(reverse("spore_ops_usage_events"), {"limit": 10})
        self.assertEqual(usage_events.status_code, 200)
        self.assertGreaterEqual(usage_events.data["count"], 1)

        audit_logs = self.client.get(reverse("spore_ops_audit_logs"), {"limit": 10})
        self.assertEqual(audit_logs.status_code, 200)
        self.assertGreaterEqual(audit_logs.data["count"], 1)

    def test_api_key_create_and_revoke(self):
        create_response = self.client.post(
            reverse("spore_ops_api_keys"),
            {"tenant_slug": self.tenant.slug, "name": "automation-key"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertIn("plaintext_key", create_response.data)
        key_id = create_response.data["api_key"]["id"]

        list_response = self.client.get(reverse("spore_ops_api_keys"))
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(list_response.data["count"], 1)

        revoke_response = self.client.post(
            reverse("spore_ops_api_key_revoke", kwargs={"pk": key_id}),
            {},
            format="json",
        )
        self.assertEqual(revoke_response.status_code, 200)
        self.assertEqual(revoke_response.data["status"], "revoked")

        tenant_context = self.client.get(reverse("spore_ops_tenant_context"))
        self.assertEqual(tenant_context.status_code, 200)
        self.assertEqual(tenant_context.data["active_tenant"]["slug"], self.tenant.slug)

    @override_settings(
        SPORE_QDRANT_ENABLED=False,
        CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    )
    def test_api_key_auth_can_access_spore_query(self):
        from apps.spore.models import SporeApiKey

        raw_key = "spore_test_key_123456"
        SporeApiKey.objects.create(
            tenant=self.tenant,
            created_by=self.user,
            name="test-key",
            prefix=raw_key[:12],
            key_hash=hash_api_key(raw_key),
        )

        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_X_SPORE_API_KEY=raw_key)

        ingest_response = self.client.post(
            reverse("spore_ingest"),
            {
                "source_platform": "manual",
                "external_id": "seed-api-key",
                "text": "api key auth seed",
            },
            format="json",
        )
        self.assertEqual(ingest_response.status_code, 201)

        query_response = self.client.post(
            reverse("spore_query"),
            {"query_text": "api key auth", "top_k": 3, "hops": 2, "damping": 0.7},
            format="json",
        )
        self.assertEqual(query_response.status_code, 200)

    def test_self_serve_tenant_create(self):
        user_model = get_user_model()
        new_user = user_model.objects.create(
            username="new-owner",
            wallet_address="0x7777777777777777777777777777777777777777",
            is_active=True,
        )
        self.client.force_authenticate(user=new_user)

        response = self.client.post(
            reverse("spore_ops_tenants"),
            {"slug": "self-serve-tenant", "name": "Self Serve Tenant", "plan": "starter"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["tenant"]["slug"], "self-serve-tenant")

    def test_seed_scenario_endpoint(self):
        response = self.client.post(
            reverse("spore_ops_seed_scenario"),
            {
                "tenant_slug": self.tenant.slug,
                "scenario": "campaign_launch",
                "content_per_account": 2,
                "ambient_accounts": 2,
            },
            format="json",
            HTTP_X_SPORE_TENANT=self.tenant.slug,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["scenario"], "campaign_launch")

    @override_settings(SPORE_ENABLE_PHASE3=True, ANTHROPIC_API_KEY="test-key")
    @mock.patch("apps.ai_core.service.AICoreScoringService.generate_brief_concepts")
    def test_phase3_brief_generate_with_llm(self, mock_generate):
        """Test brief generation with mocked Claude API."""
        mock_generate.return_value = {
            "concepts": [
                {
                    "title": "DeFi Innovation Spotlight",
                    "copy": "Discover how SPORE is revolutionizing on-chain analysis for crypto builders.",
                    "engagement_prediction": 78,
                    "risk_score": 15,
                    "confidence_interval": [70, 85],
                    "risk_flags": ["brand_safety_low"],
                },
                {
                    "title": "Builder Analytics Suite",
                    "copy": "New tools for serious crypto builders. Data-driven insights, zero fluff.",
                    "engagement_prediction": 72,
                    "risk_score": 20,
                    "confidence_interval": [65, 78],
                    "risk_flags": ["brand_safety_low"],
                },
                {
                    "title": "On-Chain Intelligence",
                    "copy": "SPORE analyzes millions of data points so you don't have to. Built for builders.",
                    "engagement_prediction": 75,
                    "risk_score": 18,
                    "confidence_interval": [68, 82],
                    "risk_flags": ["brand_safety_low"],
                },
            ]
        }

        response = self.client.post(
            reverse("spore_brief_generate"),
            {
                "brand": "SPORE",
                "audience": "crypto builders",
                "platform": "twitter",
                "tone": "analytical",
                "objective": "increase awareness",
                "concept_count": 3,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["concepts"]), 3)
        self.assertEqual(response.data["model"], "claude-3-sonnet")

        # Verify mock was called with correct arguments
        mock_generate.assert_called_once()
        call_kwargs = mock_generate.call_args.kwargs
        self.assertEqual(call_kwargs["brand"], "SPORE")
        self.assertEqual(call_kwargs["audience"], "crypto builders")
        self.assertEqual(call_kwargs["platform"], "twitter")
        self.assertEqual(call_kwargs["tone"], "analytical")
        self.assertEqual(call_kwargs["objective"], "increase awareness")
        self.assertEqual(call_kwargs["concept_count"], 3)

    @override_settings(SPORE_ENABLE_PHASE3=True, ANTHROPIC_API_KEY="")
    def test_phase3_brief_generate_fallback_to_stub(self):
        """Test that brief generation falls back to stub when LLM fails."""
        response = self.client.post(
            reverse("spore_brief_generate"),
            {
                "brand": "SPORE",
                "audience": "crypto builders",
                "platform": "twitter",
                "tone": "analytical",
                "objective": "increase awareness",
                "concept_count": 3,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["concepts"]), 3)
        self.assertEqual(response.data["model"], "phase3-stub-v1-fallback")
        # Verify stub structure
        for concept in response.data["concepts"]:
            self.assertIn("title", concept)
            self.assertIn("copy", concept)
            self.assertIn("engagement_prediction", concept)
            self.assertIn("risk_score", concept)
            self.assertIn("confidence_interval", concept)
            self.assertIn("risk_flags", concept)

