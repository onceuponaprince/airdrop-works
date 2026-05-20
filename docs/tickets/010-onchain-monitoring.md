# 010 — Monitoring & alerts for payouts

Owner: infra
Estimate: 0.5–1 day

Description:
- Add Prometheus metrics and alerts for payouts, gas spend, failures, and circuit breaker triggers. Create Grafana panels for visibility.

Tasks:
- Instrument backend to emit payouts_attempted, payouts_success, payouts_failed, gas_spent_total.
- Add PrometheusRule alerts and Grafana dashboard panels.
- Document alert runbook steps.

Acceptance:
- Alerts fire in staging when simulated failures are injected; dashboard panels display metrics.

Status: open
