# 008 — Guardrails & circuit breaker

Owner: backend-owner / infra
Estimate: 1 day

Description:
- Add gas/cost limits, per-batch and daily spend caps, and a circuit breaker that pauses executor when thresholds are exceeded.

Tasks:
- Add config for per-tx and per-batch limits.
- Implement circuit breaker logic and alerts.
- Add Grafana panels and Prometheus rules.

Acceptance:
- Circuit breaker triggers under simulated high-cost conditions and alerts are fired.

Status: open
