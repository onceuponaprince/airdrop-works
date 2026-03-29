import { ethers, network } from "hardhat";
import fs from "fs";

const CONFIRMATIONS = 2;
const SETTLE_MS = 5000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForConfirmation(contract: any, label: string) {
    const tx = contract.deploymentTransaction();
    if (tx) {
        console.log(`     Waiting for ${CONFIRMATIONS} confirmations...`);
        await tx.wait(CONFIRMATIONS);
    }
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    console.log(`     ✓ ${label}: ${addr}`);
    console.log(`     Settling (${SETTLE_MS / 1000}s)...\n`);
    await sleep(SETTLE_MS);
    return addr;
}

async function getGasOverrides() {
    const feeData = await ethers.provider.getFeeData();
    if (feeData.maxFeePerGas) {
        return {
            maxFeePerGas: (feeData.maxFeePerGas * 3n) / 2n,
            maxPriorityFeePerGas: (feeData.maxPriorityFeePerGas ?? 0n) * 2n,
        };
    }
    if (feeData.gasPrice) {
        return { gasPrice: (feeData.gasPrice * 3n) / 2n };
    }
    return {};
}

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = network.name;
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log("═══════════════════════════════════════════════");
    console.log("  AI(r)Drop Contract Deployment");
    console.log("═══════════════════════════════════════════════");
    console.log(`  Network:  ${networkName}`);
    console.log(`  Deployer: ${deployer.address}`);
    console.log(`  Balance:  ${ethers.formatEther(balance)} ETH/AVAX`);
    console.log("═══════════════════════════════════════════════\n");

    if (balance === 0n) {
        throw new Error("Deployer has no funds. Get testnet tokens from a faucet.");
    }

    const overrides = await getGasOverrides();
    console.log("  Gas overrides:", JSON.stringify(overrides, (_, v) => typeof v === "bigint" ? v.toString() : v), "\n");

    const deployed: Record<string, string> = {};

    // ═══ STEP 1: Deploy InnovatorToken ═══
    console.log("1/4  Deploying InnovatorToken...");
    const InnovatorToken = await ethers.getContractFactory("InnovatorToken");
    const innovatorToken = await InnovatorToken.deploy(deployer.address, overrides);
    deployed.InnovatorToken = await waitForConfirmation(innovatorToken, "InnovatorToken");

    // ═══ STEP 2: Deploy ProfileNFT ═══
    // ProfileNFT needs a "nexus" address — for AI(r)Drop v1, the deployer acts as nexus
    // (platform backend mints profiles via the deployer wallet)
    console.log("2/4  Deploying ProfileNFT...");
    const ProfileNFT = await ethers.getContractFactory("ProfileNFT");
    const profileNFT = await ProfileNFT.deploy(deployer.address, overrides);
    deployed.ProfileNFT = await waitForConfirmation(profileNFT, "ProfileNFT");

    // ═══ STEP 3: Deploy CampaignEscrow ═══
    console.log("3/4  Deploying CampaignEscrow...");
    const CampaignEscrow = await ethers.getContractFactory("CampaignEscrow");
    const campaignEscrow = await CampaignEscrow.deploy(
        deployer.address,
        deployer.address,
        overrides,
    );
    deployed.CampaignEscrow = await waitForConfirmation(campaignEscrow, "CampaignEscrow");

    // ═══ STEP 4: Deploy RewardDistributor ═══
    console.log("4/4  Deploying RewardDistributor...");
    const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
    const rewardDistributor = await RewardDistributor.deploy(
        deployer.address,
        deployed.InnovatorToken,
        deployed.ProfileNFT,
        overrides,
    );
    deployed.RewardDistributor = await waitForConfirmation(rewardDistributor, "RewardDistributor");

    // ═══ POST-DEPLOY: Wire contracts together ═══
    console.log("Wiring contracts...");

    const setDistTx = await innovatorToken.setDistributor(deployed.RewardDistributor, overrides);
    console.log("  Waiting for setDistributor confirmation...");
    await setDistTx.wait(CONFIRMATIONS);
    console.log("  ✓ InnovatorToken.distributor → RewardDistributor");
    await sleep(SETTLE_MS);

    const initialSupply = ethers.parseEther("1000000");
    const mintTx = await innovatorToken.mint(deployed.RewardDistributor, initialSupply, overrides);
    console.log("  Waiting for mint confirmation...");
    await mintTx.wait(CONFIRMATIONS);
    console.log(`  ✓ Minted 1,000,000 INOV to RewardDistributor`);

    // ═══ SAVE DEPLOYMENT ═══
    const deploymentDir = `./deployments/${networkName}`;
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const deploymentData = {
        network: networkName,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: deployed,
    };

    const filepath = `${deploymentDir}/deployment.json`;
    fs.writeFileSync(filepath, JSON.stringify(deploymentData, null, 2));

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`  Deployment complete! Saved to ${filepath}`);
    console.log(`═══════════════════════════════════════════════`);
    console.log(`\n  InnovatorToken:     ${deployed.InnovatorToken}`);
    console.log(`  ProfileNFT:         ${deployed.ProfileNFT}`);
    console.log(`  CampaignEscrow:     ${deployed.CampaignEscrow}`);
    console.log(`  RewardDistributor:  ${deployed.RewardDistributor}`);
    console.log(`\n  Next: run 'npm run verify:${networkName}' to verify on explorer`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
