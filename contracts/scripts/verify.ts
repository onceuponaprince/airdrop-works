import { run, network } from "hardhat";
import fs from "fs";

async function main() {
    const networkName = network.name;
    const filepath = `./deployments/${networkName}/deployment.json`;

    if (!fs.existsSync(filepath)) {
        throw new Error(`No deployment found at ${filepath}. Run deploy first.`);
    }

    const deployment = JSON.parse(fs.readFileSync(filepath, "utf8"));
    const contracts = deployment.contracts;
    const deployer = deployment.deployer;

    console.log(`Verifying contracts on ${networkName}...\n`);

    // InnovatorToken
    try {
        console.log("Verifying InnovatorToken...");
        await run("verify:verify", {
            address: contracts.InnovatorToken,
            constructorArguments: [deployer],
        });
        console.log("  ✓ InnovatorToken verified\n");
    } catch (e: any) {
        console.log(`  ✗ ${e.message}\n`);
    }

    // ProfileNFT
    try {
        console.log("Verifying ProfileNFT...");
        await run("verify:verify", {
            address: contracts.ProfileNFT,
            constructorArguments: [deployer],
        });
        console.log("  ✓ ProfileNFT verified\n");
    } catch (e: any) {
        console.log(`  ✗ ${e.message}\n`);
    }

    // CampaignEscrow
    try {
        console.log("Verifying CampaignEscrow...");
        await run("verify:verify", {
            address: contracts.CampaignEscrow,
            constructorArguments: [deployer, deployer],
        });
        console.log("  ✓ CampaignEscrow verified\n");
    } catch (e: any) {
        console.log(`  ✗ ${e.message}\n`);
    }

    // RewardDistributor
    try {
        console.log("Verifying RewardDistributor...");
        await run("verify:verify", {
            address: contracts.RewardDistributor,
            constructorArguments: [deployer, contracts.InnovatorToken, contracts.ProfileNFT],
        });
        console.log("  ✓ RewardDistributor verified\n");
    } catch (e: any) {
        console.log(`  ✗ ${e.message}\n`);
    }

    console.log("Verification complete.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
