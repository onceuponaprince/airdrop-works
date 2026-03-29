# SPORE Launch Checklist (3-Day Mode)

Use this checklist before onboarding your first paying design partner.

## 1) Environment + Infra

- [ ] `docker compose up postgres redis qdrant backend celery_worker celery_beat -d`
- [ ] Backend migrations applied (`uv run python manage.py migrate`)
- [ ] `SPORE_QDRANT_ENABLED` configured as intended
- [ ] `SPORE_AUDIT_RETENTION_DAYS` set (default: 30)
- [ ] Backend/celery logs show healthy startup (no crash loops)

## 2) Tenant Provisioning

- [ ] Run provisioning command:
  - `uv run python manage.py provision_spore_tenant --tenant-slug <slug> --tenant-name "<name>" --owner-wallet <0x...> --owner-username <name>`
- [ ] Save returned plaintext API key in password manager
- [ ] Verify tenant context endpoint for owner account

## 3) API Smoke Test

- [ ] Run smoke script:
  - `python backend/scripts/spore_launch_smoke.py --base-url http://localhost:8000/api/v1 --bearer-token <jwt> --tenant-slug <slug>`
- [ ] Verify ingest returns 201
- [ ] Verify query returns 200 with at least one result
- [ ] Verify relationship endpoint returns 200
- [ ] Verify ops summary returns 200
- [ ] Verify usage events/audit logs return 200 and non-empty results

## 4) Operational Safety

- [ ] Backup snapshot created for database
- [ ] Restore rehearsal completed once
- [ ] API key revoke flow tested
- [ ] Quota denial path tested (optional but recommended)
- [ ] Pager/alerts configured for backend and worker failures

## 5) Customer-Ready Package

- [ ] Customer quickstart shared (auth, headers, 3 API examples)
- [ ] Support channel and owner on-call defined
- [ ] Pilot scope and pricing confirmed
- [ ] First onboarding call scheduled
