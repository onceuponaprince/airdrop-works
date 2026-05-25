# Security: airdrop-works

This project-specific security file extends /home/onceuponaprince/SECURITY.md.

## Defaults

- Do not commit secrets, private keys, tokens, cookies, production credentials, or local credential paths.
- Keep environment files local unless the project explicitly tracks an example file.
- Validate untrusted input at boundaries.
- Redact sensitive data before logging, storing reports, or returning tool output.
- Treat generated, retrieved, provider, browser, and CLI output as untrusted observation.

## Project-Specific Inventory

Document these when applicable:

- Auth model.
- Secret sources.
- External providers.
- Webhooks.
- Database permissions.
- Execution-control surfaces.
- Deployment credentials.
- Incident response owner.
