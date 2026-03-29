# SPORE Runbook (First Customer)

## Provision a Tenant

From `backend/`:

```bash
uv run python manage.py provision_spore_tenant \
  --tenant-slug acme \
  --tenant-name "Acme Labs" \
  --owner-wallet 0xabc123... \
  --owner-username acme_owner
```

The command prints:

- tenant id/slug
- owner user id
- owner membership
- plaintext API key (shown once)

## Rotate API Key

1. Create a new key from SPORE Lab (`/spore-lab`) or `POST /api/v1/spore/ops/api-keys/`.
2. Update customer integration to new key.
3. Revoke old key via `POST /api/v1/spore/ops/api-keys/<uuid>/revoke/`.
4. Confirm requests with old key fail.

## Disable a Tenant

In Django shell:

```bash
uv run python manage.py shell
```

```python
from apps.spore.models import Tenant
t = Tenant.objects.get(slug="acme")
t.is_active = False
t.save(update_fields=["is_active", "updated_at"])
```

## Validate Tenant End-to-End

Run:

```bash
python backend/scripts/spore_launch_smoke.py \
  --base-url http://localhost:8000/api/v1 \
  --bearer-token <jwt> \
  --tenant-slug acme
```

## Seed Synthetic Scenario Data

For demos and test walkthroughs:

```bash
uv run python manage.py seed_spore_scenario \
  --tenant-slug acme \
  --tenant-name "Acme Labs" \
  --scenario campaign_launch \
  --content-per-account 25 \
  --ambient-accounts 10 \
  --random-seed 42
```

Supported scenarios:

- `twitter_pair`
- `campaign_launch`

## Incident Quick Actions

- Backend unhealthy: restart `backend` container and inspect logs.
- Queue stuck: restart `celery_worker` and `celery_beat`.
- Qdrant unavailable: set `SPORE_QDRANT_ENABLED=false` temporarily and continue with fallback query path.
- Neo4j unavailable: keep `SPORE_NEO4J_ENABLED=false` until the graph sync path is healthy again.
- Abuse spike: lower throttle rates for SPORE scopes and revoke suspicious keys.

## Daily Ops Checks

- Review `/spore/ops/usage-events/` for anomalous usage.
- Review `/spore/ops/audit-logs/` for suspicious actions.
- Confirm audit log retention task runs daily (`spore.purge_audit_logs`).
