# 007 — KMS / signing integration

Owner: web3-owner
Estimate: 1–2 days

Description:
- Integrate KMS/HSM-backed signing or a secure signing service for production keys. Define rotation and emergency revoke process.

Tasks:
- Prototype with local signing service for spike.
- Integrate with cloud KMS where available and add config toggles.
- Document rotation and emergency revoke steps.

Acceptance:
- Signing does not rely on plaintext private keys in repo; rotation steps documented.

Status: open
