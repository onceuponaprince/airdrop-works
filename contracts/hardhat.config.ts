import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-contract-sizer";
import * as dotenv from "dotenv";

dotenv.config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);
/** Single key from https://etherscan.io/myapikey — used by @nomicfoundation/hardhat-verify for Etherscan API v2 (multichain). */
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.24",
                settings: {
                    optimizer: { enabled: true, runs: 200 },
                    evmVersion: "cancun", // Avalanche + Base both support Cancun
                },
            },
        ],
    },

    networks: {
        // ═══ TESTNETS ═══
        fuji: {
            url: process.env.FUJI_RPC || "https://api.avax-test.network/ext/bc/C/rpc",
            accounts: [DEPLOYER_KEY],
            chainId: 43113,
        },
        baseSepolia: {
            url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
            accounts: [DEPLOYER_KEY],
            chainId: 84532,
        },

        // ═══ MAINNETS (for later) ═══
        avalanche: {
            url: process.env.AVAX_RPC || "https://api.avax.network/ext/bc/C/rpc",
            accounts: [DEPLOYER_KEY],
            chainId: 43114,
        },
        base: {
            url: process.env.BASE_RPC || "https://mainnet.base.org",
            accounts: [DEPLOYER_KEY],
            chainId: 8453,
        },

        // ═══ LOCAL ═══
        hardhat: {
            chainId: 31337,
            accounts: {
                mnemonic: "test test test test test test test test test test test junk",
                accountsBalance: "10000000000000000000000000",
            },
        },
    },

    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },

    contractSizer: {
        alphaSort: true,
        runOnCompile: false,
        strict: true,
    },
};

export default config;
