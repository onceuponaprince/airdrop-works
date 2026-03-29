# Compliance Notes

This repository includes a GDPR-focused operational compliance starter for AI(r)Drop and SPORE.

## Data categories

- Account identity: wallet address, optional email, profile fields
- Product data: contributions, scores, graph queries, relationship analyses
- Tenant operations: memberships, API keys (hashed only), usage events, audit logs
- Billing metadata: Stripe customer/subscription identifiers and plan state

## Retention

- SPORE audit log retention is controlled by `SPORE_AUDIT_RETENTION_DAYS`.
- The scheduled Celery task `spore.purge_audit_logs` deletes audit logs older than the configured retention period.
- Usage events, subscriptions, and contribution data should be retained according to customer contracts and internal policy.

## Data subject rights

- Authenticated export endpoint: `GET /api/v1/auth/me/export/`
- Authenticated delete endpoint: `DELETE /api/v1/auth/me/delete/`

## Operational expectations

- Operators should maintain an up-to-date subprocessor list and customer-facing privacy notice.
- Tenant-scoped billing and quota state should be managed from Stripe webhook events or approved administrative workflows.
- Secrets and API keys should never be stored in plaintext outside approved secret-management systems.
