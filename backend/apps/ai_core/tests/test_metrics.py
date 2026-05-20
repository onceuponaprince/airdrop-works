from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.ai_core.metrics import (
    record_llm_budget_warning,
    record_llm_call,
    record_llm_rate_limited,
    record_payout_gas_estimate,
    record_payout_send,
    render_prometheus_metrics,
)


class AICoreMetricsTests(TestCase):
    def test_render_prometheus_metrics_includes_llm_and_payout_counters(self):
        record_llm_call(scope="user", scope_id="metrics-test-user", mode="anthropic")
        record_llm_rate_limited(scope="tenant", scope_id="metrics-test-tenant")
        record_llm_budget_warning(scope="global", scope_id="default")
        record_payout_gas_estimate(token="0xabc", chain="avalanche", success=True)
        record_payout_send(token="0xabc", chain="avalanche", success=False)

        metrics = render_prometheus_metrics()

        self.assertIn("# HELP airdrop_llm_calls_total Total LLM calls by scope and mode.", metrics)
        self.assertIn('airdrop_llm_calls_total{mode="anthropic",scope="user",scope_id="metrics-test-user"} 1', metrics)
        self.assertIn('airdrop_llm_rate_limited_total{scope="tenant",scope_id="metrics-test-tenant"} 1', metrics)
        self.assertIn('airdrop_llm_budget_warning_total{scope="global",scope_id="default"} 1', metrics)
        self.assertIn('airdrop_payout_gas_estimate_total{chain="avalanche",success="true",token="0xabc"} 1', metrics)
        self.assertIn('airdrop_payout_send_total{chain="avalanche",success="false",token="0xabc"} 1', metrics)

    def test_metrics_endpoint_returns_prometheus_text(self):
        response = APIClient().get(reverse("ai_core_metrics"))

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/plain", response["Content-Type"])
        self.assertIn("# HELP airdrop_llm_calls_total", response.content.decode())
