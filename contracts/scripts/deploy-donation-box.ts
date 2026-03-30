import { ethers, network } from "hardhat";
import fs from "fs";

const CONFIRMATIONS = 2;
const SETTLE_MS = 5000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
    const [deployer] = await ethers.getSigners();
    const networkName = network.name;
    const balance = await ethers.provider.getBalance(deployer.address);

    console.log("═══════════════════════════════════════════════");
    console.log("  DonationBox Deployment");
    console.log("═══════════════════════════════════════════════");
    console.log(`  Network:  ${networkName}`);
    console.log(`  Deployer: ${deployer.address}`);
    console.log(`  Balance:  ${ethers.formatEther(balance)} ETH/AVAX`);
    console.log("═══════════════════════════════════════════════\n");

    if (balance === 0n) {
        throw new Error("Deployer has no funds. Get testnet tokens from a faucet.");
    }

    const feeData = await ethers.provider.getFeeData();
    const overrides: Record<string, bigint> = {};
    if (feeData.maxFeePerGas) {
        overrides.maxFeePerGas = (feeData.maxFeePerGas * 3n) / 2n;
        overrides.maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas ?? 0n) * 2n;
    } else if (feeData.gasPrice) {
        overrides.gasPrice = (feeData.gasPrice * 3n) / 2n;
    }

    console.log("Deploying DonationBox...");
    const DonationBox = await ethers.getContractFactory("DonationBox");
    const donationBox = await DonationBox.deploy(deployer.address, overrides);

    const tx = donationBox.deploymentTransaction();
    if (tx) {
        console.log(`  Waiting for ${CONFIRMATIONS} confirmations...`);
        await tx.wait(CONFIRMATIONS);
    }
    await donationBox.waitForDeployment();
    const addr = await donationBox.getAddress();
    console.log(`  ✓ DonationBox: ${addr}\n`);
    await sleep(SETTLE_MS);

    const deploymentDir = `./deployments/${networkName}`;
    if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const filepath = `${deploymentDir}/donation-box.json`;
    fs.writeFileSync(filepath, JSON.stringify({
        network: networkName,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contract: addr,
    }, null, 2));

    console.log(`Saved to ${filepath}`);
    console.log(`\nDonationBox address: ${addr}`);
    console.log(`Run 'npx hardhat verify --network ${networkName} ${addr} ${deployer.address}' to verify.`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
