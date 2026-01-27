/**
 * Test script to swap tokens on a Solayer CPMM pool
 *
 * Prerequisites:
 * 1. Have a keypair.json file in the test directory
 * 2. Have a pool already created (set POOL_ID env var)
 * 3. Have token balances to swap
 *
 * Usage:
 *   POOL_ID=<pool-address> yarn test:swap
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount, NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";

import { Raydium, TxVersion } from "../src";
import { getProgramIdConfig } from "../src/common/programId";

// Configuration
const SOLAYER_DEVNET_RPC = process.env.SOLAYER_DEVNET_RPC || "https://devnet-rpc.solayer.org";

// Load wallet from keypair.json file
function loadWallet(): Keypair {
  const keypairPath = process.env.KEYPAIR_PATH
    || path.join(__dirname, "keypair.json")
    || path.join(process.env.HOME || "~", ".config/solana/id.json");

  if (!fs.existsSync(keypairPath)) {
    throw new Error(
      `Keypair file not found at: ${keypairPath}\n` +
      `Please create a keypair.json file in the test directory or set KEYPAIR_PATH env var.`
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
  console.log("Solayer CPMM Swap Test");
  console.log("=".repeat(60));

  // Get pool ID from environment
  const poolId = "4x19zEw6yL5y224CQ85Fmy9SVf2KdfL38t5mkBDUt8ng";
  if (!poolId) {
    console.error("ERROR: POOL_ID environment variable is required");
    console.log("\nUsage: POOL_ID=<pool-address> yarn test:swap");
    return;
  }
  console.log("\nPool ID:", poolId);

  // Load wallet
  const wallet = loadWallet();
  console.log("Wallet Public Key:", wallet.publicKey.toBase58());

  // Create connection to Solayer devnet
  const connection = new Connection(SOLAYER_DEVNET_RPC, {
    commitment: "confirmed",
  });
  console.log("Connected to Solayer Devnet:", SOLAYER_DEVNET_RPC);

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet SOL Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  // Initialize the SDK
  console.log("\nInitializing Raydium SDK...");
  const raydium = await Raydium.load({
    connection,
    cluster: "solayer-devnet",
    owner: wallet,
  });
  console.log("SDK initialized successfully");

  // Get program config
  const programConfig = getProgramIdConfig("solayer-devnet");
  console.log("\nCPMM Program:", programConfig.CREATE_CPMM_POOL_PROGRAM.toBase58());

  // Fetch pool info from RPC
  console.log("\n--- Fetching Pool Info ---");
  let poolInfo, poolKeys, rpcData;
  try {
    const poolData = await raydium.cpmm.getPoolInfoFromRpc(poolId);
    poolInfo = poolData.poolInfo;
    poolKeys = poolData.poolKeys;
    rpcData = poolData.rpcData;
  } catch (error) {
    console.error("Failed to fetch pool info:", error);
    return;
  }

  console.log("Pool fetched successfully!");
  console.log("  Mint A:", poolInfo.mintA.address, `(${poolInfo.mintA.decimals} decimals)`);
  console.log("  Mint B:", poolInfo.mintB.address, `(${poolInfo.mintB.decimals} decimals)`);
  console.log("  LP Mint:", poolInfo.lpMint.address);
  console.log("  Base Reserve:", rpcData.baseReserve.toString());
  console.log("  Quote Reserve:", rpcData.quoteReserve.toString());

  // Determine which token to swap
  // Default: swap SOL (mintB) for the other token (mintA)
  const swapFromSol = process.env.SWAP_DIRECTION !== "token_to_sol";
  const inputMint = swapFromSol ? poolInfo.mintB.address : poolInfo.mintA.address;
  const outputMint = swapFromSol ? poolInfo.mintA.address : poolInfo.mintB.address;
  const inputDecimals = swapFromSol ? poolInfo.mintB.decimals : poolInfo.mintA.decimals;
  const outputDecimals = swapFromSol ? poolInfo.mintA.decimals : poolInfo.mintB.decimals;

  console.log("\n--- Swap Direction ---");
  console.log("  Input:", inputMint);
  console.log("  Output:", outputMint);

  // Check token balances
  console.log("\n--- Checking Token Balances ---");

  // Check SOL balance
  console.log("  SOL Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  // Check input token balance (if not SOL)
  let inputBalance = BigInt(0);
  const isInputSol = inputMint === NATIVE_MINT.toBase58();

  if (isInputSol) {
    inputBalance = BigInt(balance);
  } else {
    try {
      const inputAta = await getAssociatedTokenAddress(new PublicKey(inputMint), wallet.publicKey);
      const inputAccount = await getAccount(connection, inputAta);
      inputBalance = inputAccount.amount;
      console.log(`  Input Token Balance: ${Number(inputBalance) / Math.pow(10, inputDecimals)}`);
    } catch {
      console.error("  No input token account found!");
      return;
    }
  }

  // Define swap amount
  const swapAmountNum = parseFloat(process.env.SWAP_AMOUNT || "0.01");
  const swapAmountRaw = new BN(Math.floor(swapAmountNum * Math.pow(10, inputDecimals)));

  console.log(`\n  Swap Amount: ${swapAmountNum} (${swapAmountRaw.toString()} raw)`);

  // Check if we have enough balance
  if (inputBalance < BigInt(swapAmountRaw.toString())) {
    console.error(`\n  ERROR: Insufficient input balance!`);
    console.log(`  Required: ${swapAmountNum}`);
    console.log(`  Available: ${Number(inputBalance) / Math.pow(10, inputDecimals)}`);
    return;
  }

  // Compute swap result
  console.log("\n--- Computing Swap ---");
  const baseIn = inputMint === poolInfo.mintA.address;
  const slippage = parseFloat(process.env.SLIPPAGE || "0.01"); // 1% default slippage

  // Build pool compute data from rpc data
  const poolComputeData = {
    id: new PublicKey(poolId),
    version: 7 as const,
    configInfo: rpcData.configInfo!,
    mintA: poolInfo.mintA,
    mintB: poolInfo.mintB,
    authority: new PublicKey(poolKeys.authority),
    ...rpcData,
  };

  const swapCompute = raydium.cpmm.computeSwapAmount({
    pool: poolComputeData,
    amountIn: swapAmountRaw,
    outputMint,
    slippage,
    swapBaseIn: true,
  });

  console.log("  Amount In:", swapAmountRaw.toString(), `(${swapAmountNum})`);
  console.log("  Expected Out:", swapCompute.amountOut.toString(),
    `(${Number(swapCompute.amountOut.toString()) / Math.pow(10, outputDecimals)})`);
  console.log("  Min Out (with slippage):", swapCompute.minAmountOut.toString(),
    `(${Number(swapCompute.minAmountOut.toString()) / Math.pow(10, outputDecimals)})`);
  console.log("  Fee:", swapCompute.fee.toString());
  console.log("  Price Impact:", swapCompute.priceImpact.toString());

  // Execute swap
  try {
    console.log("\n" + "-".repeat(60));
    console.log("Executing Swap...");
    console.log("-".repeat(60));

    const { execute } = await raydium.cpmm.swap({
      poolInfo,
      poolKeys,
      inputAmount: swapAmountRaw,
      baseIn,
      fixedOut: false,
      swapResult: {
        inputAmount: swapAmountRaw,
        outputAmount: swapCompute.minAmountOut,
      },
      slippage,
      txVersion: TxVersion.V0,
      computeBudgetConfig: {
        microLamports: 100000,
        units: 400000,
      },
    });

    console.log("\nSending transaction...");
    const { txId } = await execute({ sendAndConfirm: true });

    console.log("\n" + "=".repeat(60));
    console.log("SUCCESS! Swap completed!");
    console.log("=".repeat(60));
    console.log("\nTransaction ID:", txId);
    console.log("\nExplorer URL:");
    console.log(`  https://explorer.solayer.org/tx/${txId}?cluster=devnet`);

    // Show new balances
    console.log("\n--- New Balances ---");
    const newSolBalance = await connection.getBalance(wallet.publicKey);
    console.log("  SOL:", newSolBalance / LAMPORTS_PER_SOL);

    if (!isInputSol) {
      try {
        const inputAta = await getAssociatedTokenAddress(new PublicKey(inputMint), wallet.publicKey);
        const inputAccount = await getAccount(connection, inputAta);
        console.log(`  Input Token: ${Number(inputAccount.amount) / Math.pow(10, inputDecimals)}`);
      } catch {}
    }

    try {
      const outputAta = await getAssociatedTokenAddress(new PublicKey(outputMint), wallet.publicKey);
      const outputAccount = await getAccount(connection, outputAta);
      console.log(`  Output Token: ${Number(outputAccount.amount) / Math.pow(10, outputDecimals)}`);
    } catch {}

  } catch (error) {
    console.error("\nError executing swap:");
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
