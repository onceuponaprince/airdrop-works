# AI(r)Drop Smart Contract Deployment Guide

## What you're deploying

4 contracts adapted from the TG Diamond Pattern codebase:

| Contract | Adapted From | Purpose |
|----------|-------------|---------|
| **InnovatorToken** | XpToken (GuildXp) | ERC20 reward token. Non-transferrable except from distributor. Minted by platform, distributed to contributors. |
| **ProfileNFT** | ProfileNFT (direct reuse) | ERC721 identity NFT. One per contributor. Stores on-chain profile metadata. |
| **CampaignEscrow** | EscrowTokenFacet | Holds reward pools for quests. Projects deposit tokens, platform distributes based on AI Judge scores. |
| **RewardDistributor** | Rewarder / DiamondLootDistributors | Distributes InnovatorTokens based on AI Judge score tiers. Batch distribution for gas efficiency. |

What was **dropped from TG** for v1: TaxCalculator (no fees for v1), TaxManager, TierManager, Warden system, Party rations, Tavern, Safehold, Account (ERC6551), Nexus hub. These can be re-added via Diamond cuts when needed.

---

## Prerequisites

### 1. Install Node.js and npm

```bash
# Check versions
node -v    # Need v18+
npm -v     # Need v9+
```

### 2. Get testnet tokens

You need tokens on **both** testnets to pay for gas:

**Avalanche Fuji (AVAX):**
- Go to: https://faucet.avax.network/
- Connect your wallet
- Select "Fuji (C-Chain)"
- Request 2 AVAX (enough for ~50 deployments)

**Base Sepolia (ETH):**
- Go to: https://www.alchemy.com/faucets/base-sepolia
- Or: https://faucet.quicknode.com/base/sepolia
- Enter your wallet address
- Request 0.1 ETH (enough for ~20 deployments)

### 3. Get a deployer wallet

Use a **dedicated wallet** for deployments. Never use your main wallet.

```bash
# Generate a new wallet (or use MetaMask "Create Account")
# Export the private key — you'll need it for .env
```

### 4. Get an Etherscan API key (for verification)

Hardhat verifies via **Etherscan API v2** using a **single** key from [etherscan.io/myapikey](https://etherscan.io/myapikey). That key covers Base, Avalanche, and other supported chains (no separate Basescan/Snowtrace keys).

---

## Step-by-step deployment

### Step 1: Set up the project

```bash
cd contracts
npm install
```

### Step 2: Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# YOUR deployer wallet private key (with 0x prefix)
DEPLOYER_PRIVATE_KEY=0xabcdef1234567890...

# RPCs — defaults work fine for testnet
FUJI_RPC=https://api.avax-test.network/ext/bc/C/rpc
BASE_SEPOLIA_RPC=https://sepolia.base.org

# Etherscan unified API key (v2) — verification on Base, Avalanche, etc.
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### Step 3: Compile contracts

```bash
npx hardhat compile
```

You should see:

```
Compiled 7 Solidity files successfully
```

If you get OpenZeppelin import errors:

```bash
npm install @openzeppelin/contracts@^5.0.0
npx hardhat compile
```

### Step 4: Test locally first

```bash
npx hardhat run scripts/deploy.ts --network hardhat
```

This deploys to a local in-memory chain. You should see all 4 contracts deploy successfully with addresses and the wiring steps completing.

### Step 5: Deploy to Avalanche Fuji

```bash
npm run deploy:fuji
```

Expected output:

```
═══════════════════════════════════════════════
  AI(r)Drop Contract Deployment
═══════════════════════════════════════════════
  Network:  fuji
  Deployer: 0xYourAddress...
  Balance:  1.98 ETH/AVAX
═══════════════════════════════════════════════

1/4  Deploying InnovatorToken...
     ✓ InnovatorToken: 0x...

2/4  Deploying ProfileNFT...
     ✓ ProfileNFT:     0x...

3/4  Deploying CampaignEscrow...
     ✓ CampaignEscrow: 0x...

4/4  Deploying RewardDistributor...
     ✓ RewardDistributor: 0x...

Wiring contracts...
  ✓ InnovatorToken.distributor → RewardDistributor
  ✓ Minted 1,000,000 INOV to RewardDistributor

═══════════════════════════════════════════════
  Deployment complete! Saved to ./deployments/fuji/deployment.json
═══════════════════════════════════════════════
```

**Save the addresses.** They're in `deployments/fuji/deployment.json`.

### Step 6: Deploy to Base Sepolia

```bash
npm run deploy:baseSepolia
```

Same process. Addresses saved to `deployments/baseSepolia/deployment.json`.

### Step 7: Verify on block explorers

```bash
# Verify on Snowtrace (Fuji)
npm run verify:fuji

# Verify on Basescan (Base Sepolia)
npm run verify:baseSepolia
```

Verification lets anyone read your source code on the explorer. If verification fails with "Already verified" — that's fine, it means the explorer already matched the bytecode.

### Step 8: Verify deployment manually

Go to the block explorers and check your contracts:

**Fuji:** `https://testnet.snowtrace.io/address/YOUR_CONTRACT_ADDRESS`
**Base Sepolia:** `https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS`

You should see:
- Contract source code verified (green checkmark)
- Contract creator = your deployer address
- InnovatorToken has 1,000,000 INOV balance on the RewardDistributor

---

## Post-deployment: Connect to Django backend

Add your deployed contract addresses to the Django backend `.env`:

```bash
# In backend/.env — add these after deployment

# Avalanche Fuji
FUJI_INNOVATOR_TOKEN=0x...
FUJI_PROFILE_NFT=0x...
FUJI_CAMPAIGN_ESCROW=0x...
FUJI_REWARD_DISTRIBUTOR=0x...

# Base Sepolia
BASE_SEPOLIA_INNOVATOR_TOKEN=0x...
BASE_SEPOLIA_PROFILE_NFT=0x...
BASE_SEPOLIA_CAMPAIGN_ESCROW=0x...
BASE_SEPOLIA_REWARD_DISTRIBUTOR=0x...
```

The Django backend's Celery tasks call `RewardDistributor.distribute()` after the AI Judge scores a contribution. The platform wallet (deployer) signs these transactions.

---

## Contract interaction cheat sheet

### Mint a ProfileNFT to a user

```javascript
// From your backend or hardhat console
const profileNFT = await ethers.getContractAt("ProfileNFT", PROFILE_NFT_ADDRESS);
const tx = await profileNFT.issueProfile(userWalletAddress, "ipfs://metadata-uri");
await tx.wait();
```

### Distribute a reward after AI Judge scoring

```javascript
const distributor = await ethers.getContractAt("RewardDistributor", DISTRIBUTOR_ADDRESS);
// score = AI Judge composite score (0-100)
// contributionId = UUID from Django
const tx = await distributor.distribute(contributorAddress, 78, "uuid-from-django");
await tx.wait();
// Contributor receives 15 INOV (score 51-75 = mediumReward)
```

### Batch distribute rewards

```javascript
const distributor = await ethers.getContractAt("RewardDistributor", DISTRIBUTOR_ADDRESS);
const tx = await distributor.batchDistribute(
    [addr1, addr2, addr3],        // contributors
    [85, 42, 91],                  // AI Judge scores
    ["uuid-1", "uuid-2", "uuid-3"] // contribution IDs
);
await tx.wait();
// addr1 gets 50 INOV (76-100 = large), addr2 gets 5 INOV (26-50 = small), addr3 gets 50 INOV
```

### Create a campaign (project deposits rewards)

```javascript
const escrow = await ethers.getContractAt("CampaignEscrow", ESCROW_ADDRESS);
const token = await ethers.getContractAt("IERC20", REWARD_TOKEN_ADDRESS);

// Project approves escrow to spend tokens
await token.approve(ESCROW_ADDRESS, ethers.parseEther("5000"));

// Create campaign (5000 tokens, 30 days)
const tx = await escrow.createCampaign(
    REWARD_TOKEN_ADDRESS,
    ethers.parseEther("5000"),
    30 * 24 * 60 * 60 // 30 days in seconds
);
await tx.wait();
```

---

## Reward tier reference

| AI Judge Score | Tier | Reward | When |
|---------------|------|--------|------|
| 0-25 | None | 0 INOV | Farming detected or very low quality |
| 26-50 | Small | 5 INOV | Marginal contribution |
| 51-75 | Medium | 15 INOV | Solid contribution |
| 76-100 | Large | 50 INOV | Exceptional contribution |

Tiers are configurable via `RewardDistributor.setRewardTiers()`.

---

## Architecture: what was kept vs dropped from TG

```
TG Architecture (full)              AI(r)Drop v1 (simplified)
─────────────────────               ─────────────────────────
Nexus Diamond (hub)          →      Deployer wallet (owner)
  ├─ NexusFacet              →      (dropped — not needed)
  ├─ AccountFacet (ERC6551)  →      (dropped — wallet is identity)
  └─ factories               →      (dropped — no diamond factories)

Tavern Diamond (quest mgmt)  →      CampaignEscrow (standalone)
  ├─ TavernFacet             →      createCampaign()
  └─ QuestFacet              →      (quest logic in Django)

Escrow Diamond               →      CampaignEscrow.distributeReward()
  ├─ EscrowTokenFacet        →      (merged into CampaignEscrow)
  └─ EscrowNativeFacet       →      (dropped — ERC20 only for v1)

Rewarder                     →      RewardDistributor
  ├─ handleRewardNative      →      (dropped)
  ├─ handleRewardToken       →      distribute() / batchDistribute()
  └─ TaxCalculator           →      (dropped — no fees for v1)

XpToken (GuildXp)            →      InnovatorToken
ProfileNFT                   →      ProfileNFT (direct reuse)
TaxManager                   →      (dropped — no fees for v1)
TierManager                  →      (dropped — score tiers in contract)
Party Diamond                →      (dropped — party logic in Django)
Warden Diamond               →      (dropped — not needed for v1)
```

The Diamond Pattern infrastructure (LibDiamond, DiamondCutFacet, etc.) is preserved in the codebase for when you need to add facets via diamond cuts later. The v1 contracts are standalone for simplicity — you can wrap them in diamonds when complexity demands it.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Deployer has no funds" | Get testnet tokens from faucets (links above) |
| "nonce too low" | Your wallet has pending transactions. Wait or speed them up in MetaMask. |
| "gas required exceeds allowance" | Increase gas limit or get more testnet tokens |
| Verification fails "contract not found" | Wait 30-60 seconds after deployment before verifying. The explorer needs time to index. |
| OpenZeppelin import errors | Run `npm install @openzeppelin/contracts@^5.0.0` |
| "Already verified" | Not an error — the contract is already verified on the explorer |
| ProfileNFT "only nexus" error | The deployer address acts as nexus in v1. Only the deployer can mint profiles. |

---

## Mainnet deployment (when ready)

When you're ready to go to mainnet, the process is identical:

```bash
# Update .env with mainnet RPCs (use Infura/Alchemy for reliability)
AVAX_RPC=https://avalanche-mainnet.infura.io/v3/YOUR_KEY
BASE_RPC=https://base-mainnet.infura.io/v3/YOUR_KEY

# Deploy
npx hardhat run scripts/deploy.ts --network avalanche
npx hardhat run scripts/deploy.ts --network base

# Verify
npx hardhat run scripts/verify.ts --network avalanche
npx hardhat run scripts/verify.ts --network base
```

Before mainnet: get a security audit on CampaignEscrow and RewardDistributor. The InnovatorToken and ProfileNFT are simple enough to self-audit. The Diamond infrastructure is Nick Mudge's reference implementation (battle-tested).
