# Judge Runbook

Purpose: Guidance for operating the AI Judge scoring system, handling failures, and enforcing cost controls.

## Phase 2 Launch Checklist

- [ ] Confirm heuristic fallback returns the expected score contract in staging.
- [ ] Confirm `ANTHROPIC_API_KEY` is configured and valid in the launch environment.
- [ ] Confirm per-user credit enforcement is active for authenticated scoring.
- [ ] Confirm throttles are enabled for both single-text scoring and account-scoring paths.
- [ ] Confirm alerting exists for LLM timeouts, auth failures, and quota exhaustion.

Quick Checks
- Ensure Anthropic API key and rate limits are configured (`ANTHROPIC_API_KEY`).
- Validate LLM quota usage and cost monitors in billing dashboard.
- Confirm fallback heuristic scorer is available and functioning.

Operational Steps
- Force a fallback scoring path (heuristic) by temporarily setting `SPORE_USE_HEURISTIC=true` in environment or toggling feature flag.
- Inspect `apps.judge.views` logs for exceptions and LLM timeouts.

Cost Controls
- Implement per-user credit checks via `apps.payments.services.deduct_credit` (already used in `JudgeScoreView`).
- If cost exceeds threshold, disable live scoring and use heuristic path until resolved.

Debugging LLM Failures
- If Anthropic returns errors or times out, check network connectivity and API key validity.
- For malformed JSON responses, examine raw `message.content` and use JSON extraction heuristics.

Runbook for Incidents
- Set `ANTHROPIC_API_KEY` to empty temporarily to force heuristic fallback and buy time to investigate.
- Notify stakeholders and open incident ticket with example inputs and timestamps.
- If fallback starts dominating, pause release rollout until the failure mode is identified.
