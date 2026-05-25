# Postman Route Smoke Tests

This folder contains a Postman collection for checking that AI(r)Drop API routes respond and serialize the expected JSON contracts.

Files:

- `airdrop-works-routes.postman_collection.json`
- `airdrop-works-local.postman_environment.json`

## Run In Postman

1. Import both JSON files into Postman.
2. Select the `AI(r)Drop Local QA` environment.
3. Set `api_base_url` to the API host, for example `http://localhost:8001` or a staging API URL.
4. Set `qa_auth_secret` if the deployed QA bypass is enabled. Local dev can leave it blank when SIWE is not enforced.
5. Run the full collection.

The `Wallet verify QA admin` request stores `access_token` and `refresh_token` into the environment for later authenticated requests.

## Run With Newman

```bash
newman run postman/airdrop-works-routes.postman_collection.json \
  -e postman/airdrop-works-local.postman_environment.json \
  --env-var api_base_url=http://localhost:8001 \
  --env-var qa_auth_secret="$QA_WALLET_LOGIN_SECRET"
```

Expected result: all route smoke tests pass. The public judge demo may accept either `200` with a score or `503` with a clear `detail` if the AI provider is not configured.
