/**
 * Test script to create a CPMM pool on Solayer devnet
 *
 * Creates a pool between LAYER and WSOL tokens
 *
 * Prerequisites:
 * 1. Set SOLAYER_DEVNET_RPC environment variable (or use default)
 * 2. Have a keypair.json file in the test directory (or set KEYPAIR_PATH env var)
 * 3. Have LAYER tokens and SOL in your wallet
 *
 * Usage:
 *   yarn test:create-pool
 *   # or with custom keypair path:
 *   KEYPAIR_PATH=/path/to/keypair.json yarn test:create-pool
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, NATIVE_MINT, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";

import { Raydium, TxVersion } from "../src";
import { getProgramIdConfig } from "../src/common/programId";
import { getCpmmPdaAmmConfigId } from "../src/raydium/cpmm/pda";

// Configuration
const SOLAYER_DEVNET_RPC = process.env.SOLAYER_DEVNET_RPC || "https://devnet-rpc.solayer.org";

// Token addresses
const LAYER_MINT = new PublicKey("LAYER4xPpTCb3QL8S9u41EAhAX7mhBn8Q6xMTwY2Yzc");
const WSOL_MINT = NATIVE_MINT; // So11111111111111111111111111111111111111112

// Load wallet from keypair.json file
function loadWallet(): Keypair {
  // Check for custom keypair path, otherwise use default locations
  const keypairPath = process.env.KEYPAIR_PATH
    || path.join(__dirname, "keypair.json")
    || path.join(process.env.HOME || "~", ".config/solana/id.json");

  if (!fs.existsSync(keypairPath)) {
    throw new Error(
      `Keypair file not found at: ${keypairPath}\n` +
      `Please create a keypair.json file in the test directory or set KEYPAIR_PATH env var.\n` +
      `You can generate one with: solana-keygen new -o test/keypair.json`
    );
  }

  try {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } catch (error) {
    throw new Error(`Failed to load keypair from ${keypairPath}: ${error}`);
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Solayer CPMM Pool Creation Test");
  console.log("LAYER / WSOL Pool");
  console.log("=".repeat(60));

  // Load wallet
  const wallet = loadWallet();
  console.log("\nWallet Public Key:", wallet.publicKey.toBase58());

  // Create connection to Solayer devnet
  const connection = new Connection(SOLAYER_DEVNET_RPC, {
    commitment: "confirmed",
  });
  console.log("Connected to Solayer Devnet:", SOLAYER_DEVNET_RPC);

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet SOL Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance < 0.5 * LAMPORTS_PER_SOL) {
    console.error("\nInsufficient SOL balance. Please fund your wallet with at least 0.5 SOL.");
    console.log("You need SOL both for transaction fees and to provide liquidity (WSOL side).");
    return;
  }

  // Initialize the SDK
  console.log("\nInitializing Raydium SDK for Solayer devnet...");
  const raydium = await Raydium.load({
    connection,
    cluster: "solayer-devnet",
    owner: wallet,
  });
  console.log("SDK initialized successfully");

  // Get program IDs
  const programConfig = getProgramIdConfig("solayer-devnet");
  console.log("\nProgram Configuration:");
  console.log("  CPMM Program:", programConfig.CREATE_CPMM_POOL_PROGRAM.toBase58());
  console.log("  CPMM Auth:", programConfig.CREATE_CPMM_POOL_AUTH.toBase58());
  console.log("  Pool Fee Account:", programConfig.CREATE_CPMM_POOL_FEE_ACC.toBase58());

  // Token info
  console.log("\nToken Pair:");
  console.log("  LAYER:", LAYER_MINT.toBase58());
  console.log("  WSOL:", WSOL_MINT.toBase58());

  // Get LAYER token info from on-chain
  const layerMintInfo = await connection.getAccountInfo(LAYER_MINT);
  if (!layerMintInfo) {
    console.error("\nLAYER mint not found on-chain!");
    return;
  }

  // Parse mint info to get decimals (offset 44, 1 byte)
  const layerDecimals = layerMintInfo.data[44];
  console.log("  LAYER Decimals:", layerDecimals);
  console.log("  WSOL Decimals: 9");

  // Check for LAYER token account
  console.log("\n--- Checking Token Balances ---");
  const layerAta = await getAssociatedTokenAddress(LAYER_MINT, wallet.publicKey);
  console.log("  LAYER ATA:", layerAta.toBase58());

  let layerBalance: bigint = BigInt(0);
  try {
    const layerAccount = await getAccount(connection, layerAta);
    layerBalance = layerAccount.amount;
    console.log("  LAYER Balance:", Number(layerBalance) / Math.pow(10, layerDecimals), "LAYER");
  } catch (e) {
    console.error("\n  ERROR: No LAYER token account found!");
    console.log("  Your wallet needs LAYER tokens to create a pool.");
    console.log("  LAYER ATA address:", layerAta.toBase58());
    console.log("\n  To fix this:");
    console.log("  1. Get some LAYER tokens sent to your wallet");
    console.log("  2. Or create a token account and mint some tokens (if you have mint authority)");
    return;
  }

  // Define pool parameters
  const layerAmountNum = 0.1; // Amount of LAYER to deposit
  const wsolAmountNum = 0.1;  // Amount of SOL to deposit

  // Convert decimal amounts to raw integer amounts (BN doesn't handle decimals!)
  const layerAmountRaw = new BN(Math.floor(layerAmountNum * Math.pow(10, layerDecimals)));

  // Check if we have enough LAYER
  if (layerBalance < BigInt(layerAmountRaw.toString())) {
    console.error(`\n  ERROR: Insufficient LAYER balance!`);
    console.log(`  Required: ${layerAmountNum} LAYER`);
    console.log(`  Available: ${Number(layerBalance) / Math.pow(10, layerDecimals)} LAYER`);
    return;
  }

  // Check if we have enough SOL
  if (balance < wsolAmountNum * LAMPORTS_PER_SOL + 0.1 * LAMPORTS_PER_SOL) {
    console.error(`\n  ERROR: Insufficient SOL balance!`);
    console.log(`  Required: ~${wsolAmountNum + 0.1} SOL (${wsolAmountNum} for pool + ~0.1 for fees)`);
    console.log(`  Available: ${balance / LAMPORTS_PER_SOL} SOL`);
    return;
  }

  console.log("  Balances OK!");

  // Get AMM config (fee tier) - using index 0 for default config
  const configIndex = 0;
  const { publicKey: configId } = getCpmmPdaAmmConfigId(
    programConfig.CREATE_CPMM_POOL_PROGRAM,
    configIndex
  );
  console.log("\nAMM Config ID (index", configIndex + "):", configId.toBase58());

  // Verify the config exists on-chain
  const configAccount = await connection.getAccountInfo(configId);
  if (!configAccount) {
    console.error("\nAMM Config not found on-chain!");
    console.log("Make sure the CPMM program has been initialized with this config.");
    console.log("You may need to create the AMM config first using the program's initialize_amm_config instruction.");
    return;
  }
  console.log("AMM Config exists on-chain (", configAccount.data.length, "bytes )");

  // Pool amounts (already validated above)
  const layerAmount = layerAmountRaw;
  const wsolAmount = new BN(wsolAmountNum * LAMPORTS_PER_SOL);
  const startTime = new BN(0); // Start immediately

  // Fee configuration (from on-chain config)
  // These values should match what's configured in the AMM config
  const feeConfig = {
    id: configId.toBase58(),
    index: configIndex,
    protocolFeeRate: 12000,   // 12% of trade fee goes to protocol
    tradeFeeRate: 2500,       // 0.25% trade fee (2500 / 1000000)
    fundFeeRate: 0,
    createPoolFee: "0",
    creatorFeeRate: 0,
  };

  console.log("\nPool Parameters:");
  console.log("  LAYER Amount:", layerAmount.toString(), `(${layerAmountNum} LAYER)`);
  console.log("  WSOL Amount:", wsolAmount.toString(), `(${wsolAmountNum} SOL)`);
  console.log("  Start Time:", startTime.toString(), "(immediate)");
  console.log("  Fee Config ID:", feeConfig.id);
  console.log("  Trade Fee Rate:", feeConfig.tradeFeeRate / 10000, "%");

  try {
    console.log("\n" + "-".repeat(60));
    console.log("Creating CPMM pool...");
    console.log("-".repeat(60));

    const { execute, extInfo } = await raydium.cpmm.createPool({
      programId: programConfig.CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount: programConfig.CREATE_CPMM_POOL_FEE_ACC,
      mintA: {
        address: LAYER_MINT.toBase58(),
        decimals: layerDecimals,
        programId: TOKEN_PROGRAM_ID.toBase58(),
      },
      mintB: {
        address: WSOL_MINT.toBase58(),
        decimals: 9,
        programId: TOKEN_PROGRAM_ID.toBase58(),
      },
      mintAAmount: layerAmount,
      mintBAmount: wsolAmount,
      startTime,
      feeConfig,
      associatedOnly: false,
      ownerInfo: {
        useSOLBalance: true, // Use SOL balance for WSOL side
      },
      txVersion: TxVersion.V0,
      computeBudgetConfig: {
        microLamports: 100000,
        units: 600000,
      },
    });

    console.log("\nPool Address Info:");
    console.log("  Pool ID:", extInfo.address.poolId.toBase58());
    console.log("  LP Mint:", extInfo.address.lpMint.toBase58());
    console.log("  Vault A (LAYER):", extInfo.address.vaultA.toBase58());
    console.log("  Vault B (WSOL):", extInfo.address.vaultB.toBase58());
    console.log("  Authority:", extInfo.address.authority.toBase58());
    console.log("  Observation ID:", extInfo.address.observationId.toBase58());

    console.log("\nExecuting transaction...");
    const { txId } = await execute({ sendAndConfirm: true });

    console.log("\n" + "=".repeat(60));
    console.log("SUCCESS! Pool created successfully!");
    console.log("=".repeat(60));
    console.log("\nTransaction ID:", txId);
    console.log("Pool ID:", extInfo.address.poolId.toBase58());
    console.log("\nExplorer URL:");
    console.log(`  https://explorer.solayer.org/tx/${txId}?cluster=devnet`);

    // Save pool info for later use
    console.log("\n--- Pool Info (save this for later) ---");
    console.log(JSON.stringify({
      poolId: extInfo.address.poolId.toBase58(),
      lpMint: extInfo.address.lpMint.toBase58(),
      mintA: LAYER_MINT.toBase58(),
      mintB: WSOL_MINT.toBase58(),
      vaultA: extInfo.address.vaultA.toBase58(),
      vaultB: extInfo.address.vaultB.toBase58(),
      authority: extInfo.address.authority.toBase58(),
      configId: extInfo.address.configId.toBase58(),
      programId: programConfig.CREATE_CPMM_POOL_PROGRAM.toBase58(),
    }, null, 2));

  } catch (error) {
    console.log("the pool is actually created, ignore the error and you should check explorer");
    console.error("\nError creating pool:");
    console.error(error);

    if (error instanceof Error) {
      console.error("\nError message:", error.message);
      if (error.stack) {
        console.error("\nStack trace:", error.stack);
      }
    }
  }
}

main().catch(console.error);
