# Judge Runbook

Purpose: Guidance for operating the AI Judge scoring system, handling failures, and enforcing cost controls.

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
