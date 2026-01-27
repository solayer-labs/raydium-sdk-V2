/**
 * Basic test for Solayer CPMM SDK
 *
 * Tests:
 * 1. SDK initialization for Solayer devnet
 * 2. Program ID configuration
 * 3. PDA derivation
 *
 * Usage:
 *   yarn dev test/solayer-basic.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { Raydium } from "../src";
import { getProgramIdConfig, isSolayerCluster } from "../src/common/programId";
import { getCpmmPdaAmmConfigId, getPdaPoolAuthority } from "../src/raydium/cpmm/pda";

const SOLAYER_DEVNET_RPC = process.env.SOLAYER_DEVNET_RPC || "https://devnet-rpc.solayer.org";

async function main() {
  console.log("=".repeat(60));
  console.log("Solayer CPMM SDK - Basic Test");
  console.log("=".repeat(60));

  // Test 1: Check cluster detection
  console.log("\n--- Test 1: Cluster Detection ---");
  console.log("Is 'solayer' a Solayer cluster?", isSolayerCluster("solayer"));
  console.log("Is 'solayer-devnet' a Solayer cluster?", isSolayerCluster("solayer-devnet"));
  console.log("Is 'mainnet' a Solayer cluster?", isSolayerCluster("mainnet"));
  console.log("Is 'devnet' a Solayer cluster?", isSolayerCluster("devnet"));

  // Test 2: Get program configuration
  console.log("\n--- Test 2: Program Configuration ---");
  const solayerDevnetConfig = getProgramIdConfig("solayer-devnet");
  console.log("Solayer Devnet Config:");
  console.log("  CPMM Program:", solayerDevnetConfig.CREATE_CPMM_POOL_PROGRAM.toBase58());
  console.log("  CPMM Auth:", solayerDevnetConfig.CREATE_CPMM_POOL_AUTH.toBase58());
  console.log("  Pool Fee Account:", solayerDevnetConfig.CREATE_CPMM_POOL_FEE_ACC.toBase58());

  const solayerMainnetConfig = getProgramIdConfig("solayer");
  console.log("\nSolayer Mainnet Config:");
  console.log("  CPMM Program:", solayerMainnetConfig.CREATE_CPMM_POOL_PROGRAM.toBase58());
  console.log("  CPMM Auth:", solayerMainnetConfig.CREATE_CPMM_POOL_AUTH.toBase58());
  console.log("  Pool Fee Account:", solayerMainnetConfig.CREATE_CPMM_POOL_FEE_ACC.toBase58());

  // Test 3: PDA derivation
  console.log("\n--- Test 3: PDA Derivation ---");
  const programId = solayerDevnetConfig.CREATE_CPMM_POOL_PROGRAM;

  // Derive pool authority
  const { publicKey: authority, nonce } = getPdaPoolAuthority(programId);
  console.log("Pool Authority PDA:", authority.toBase58(), "(nonce:", nonce, ")");

  // Derive AMM config for index 0
  const { publicKey: configId0 } = getCpmmPdaAmmConfigId(programId, 0);
  console.log("AMM Config (index 0):", configId0.toBase58());

  // Derive AMM config for index 1
  const { publicKey: configId1 } = getCpmmPdaAmmConfigId(programId, 1);
  console.log("AMM Config (index 1):", configId1.toBase58());

  // Test 4: SDK initialization
  console.log("\n--- Test 4: SDK Initialization ---");

  try {
    const connection = new Connection(SOLAYER_DEVNET_RPC, "confirmed");
    console.log("Connection established to:", SOLAYER_DEVNET_RPC);

    // Test RPC connection
    const slot = await connection.getSlot();
    console.log("Current slot:", slot);

    // Initialize SDK without owner (read-only mode)
    console.log("\nInitializing SDK in read-only mode...");
    const raydium = await Raydium.load({
      connection,
      cluster: "solayer-devnet",
    });
    console.log("SDK initialized successfully!");
    console.log("  Cluster:", raydium.cluster);
    console.log("  Is Solayer Cluster:", raydium.isSolayerCluster());

    // Test CPMM module getters
    console.log("\n--- Test 5: CPMM Module ---");
    console.log("CPMM Program ID:", raydium.cpmm.cpmmProgramId.toBase58());
    console.log("CPMM Pool Auth:", raydium.cpmm.cpmmPoolAuth.toBase58());
    console.log("CPMM Pool Fee Account:", raydium.cpmm.cpmmPoolFeeAccount.toBase58());

    console.log("\n" + "=".repeat(60));
    console.log("All basic tests passed!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("Error during SDK initialization:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
    }
  }
}

main().catch(console.error);
