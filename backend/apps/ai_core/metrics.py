"""Minimal Prometheus-style metrics exposition for AI core and rewards."""
from __future__ import annotations

from collections import Counter
from threading import Lock

_LOCK = Lock()
_METRICS: Counter[str] = Counter()


def _metric_key(name: str, **labels: str) -> str:
    ordered = ",".join(f'{key}="{value}"' for key, value in sorted(labels.items()))
    return f"{name}|{ordered}"


def _inc(name: str, amount: int = 1, **labels: str) -> None:
    with _LOCK:
        _METRICS[_metric_key(name, **labels)] += amount


def record_llm_call(*, scope: str, scope_id: str, mode: str) -> None:
    _inc("airdrop_llm_calls_total", scope=scope, scope_id=scope_id, mode=mode)


def record_llm_rate_limited(*, scope: str, scope_id: str) -> None:
    _inc("airdrop_llm_rate_limited_total", scope=scope, scope_id=scope_id)


def record_llm_budget_warning(*, scope: str, scope_id: str) -> None:
    _inc("airdrop_llm_budget_warning_total", scope=scope, scope_id=scope_id)


def record_payout_gas_estimate(*, token: str, chain: str, success: bool) -> None:
    _inc("airdrop_payout_gas_estimate_total", token=token, chain=chain, success=str(success).lower())


def record_payout_send(*, token: str, chain: str, success: bool) -> None:
    _inc("airdrop_payout_send_total", token=token, chain=chain, success=str(success).lower())


def render_prometheus_metrics() -> str:
    lines = [
        "# HELP airdrop_llm_calls_total Total LLM calls by scope and mode.",
        "# TYPE airdrop_llm_calls_total counter",
        "# HELP airdrop_llm_rate_limited_total LLM calls denied by quota guard.",
        "# TYPE airdrop_llm_rate_limited_total counter",
        "# HELP airdrop_llm_budget_warning_total LLM calls that crossed budget warning thresholds.",
        "# TYPE airdrop_llm_budget_warning_total counter",
        "# HELP airdrop_payout_gas_estimate_total Payout gas estimation attempts.",
        "# TYPE airdrop_payout_gas_estimate_total counter",
        "# HELP airdrop_payout_send_total Payout send attempts.",
        "# TYPE airdrop_payout_send_total counter",
    ]
    with _LOCK:
        items = list(_METRICS.items())
    for key, value in sorted(items):
        name, label_blob = key.split("|", 1)
        if label_blob:
            lines.append(f"{name}{{{label_blob}}} {value}")
        else:
            lines.append(f"{name} {value}")
    return "\n".join(lines) + "\n"
