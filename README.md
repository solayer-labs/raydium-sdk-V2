# Solayer CPMM SDK

**This SDK is a fork of [Raydium SDK V2](https://github.com/raydium-io/raydium-sdk-V2)** ([@raydium-io/raydium-sdk-v2](https://www.npmjs.com/package/@raydium-io/raydium-sdk-v2)), adapted for the **Solayer** chain.

An SDK for building CPMM (Constant Product Market Maker) liquidity pools and swap applications on the Solayer chain.

> **Note**: This SDK is specifically designed for the Solayer blockchain, which is a separate chain from Solana. It only supports CPMM functionality and operates in RPC-only mode (no API dependencies).

## Installation

```bash
npm install @solayer-labs/cpmm-sdk
```

or

```bash
yarn add @solayer-labs/cpmm-sdk
```

## Quick Start

### 1. Initialize the SDK

```typescript
import { Connection, Keypair } from "@solana/web3.js";
import { Raydium } from "@solayer-labs/cpmm-sdk";

// Connect to Solayer devnet or mainnet
const connection = new Connection("https://devnet-rpc.solayer.org", "confirmed");

// Initialize SDK
const raydium = await Raydium.load({
  connection,
  cluster: "solayer-devnet", // or "solayer" for mainnet
  owner: keypair, // Your Keypair or PublicKey
});
```

### 2. Create a CPMM Pool

```typescript
import { Raydium, TxVersion } from "@solayer-labs/cpmm-sdk";
import { getProgramIdConfig } from "@solayer-labs/cpmm-sdk/common/programId";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const programConfig = getProgramIdConfig("solayer-devnet");

const { execute, extInfo } = await raydium.cpmm.createPool({
  programId: programConfig.CREATE_CPMM_POOL_PROGRAM,
  poolFeeAccount: programConfig.CREATE_CPMM_POOL_FEE_ACC,
  mintA: {
    address: "LAYER4xPpTCb3QL8S9u41EAhAX7mhBn8Q6xMTwY2Yzc",
    decimals: 9,
    programId: TOKEN_PROGRAM_ID.toBase58(),
  },
  mintB: {
    address: "So11111111111111111111111111111111111111112", // WSOL
    decimals: 9,
    programId: TOKEN_PROGRAM_ID.toBase58(),
  },
  mintAAmount: new BN(100).mul(new BN(10).pow(new BN(9))), // 100 tokens
  mintBAmount: new BN(0.1 * 1e9), // 0.1 SOL
  startTime: new BN(0),
  feeConfig: {
    id: configId.toBase58(),
    index: 0,
    protocolFeeRate: 12000,
    tradeFeeRate: 2500,
    fundFeeRate: 0,
    createPoolFee: "0",
    creatorFeeRate: 0,
  },
  ownerInfo: {
    useSOLBalance: true, // Use SOL balance for WSOL side
  },
  txVersion: TxVersion.V0,
});

// Execute the transaction
const { txId } = await execute({ sendAndConfirm: true });
console.log("Pool created:", extInfo.address.poolId.toBase58());
```

### 3. Swap Tokens

```typescript
import { Raydium, TxVersion } from "@solayer-labs/cpmm-sdk";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Fetch pool info
const poolData = await raydium.cpmm.getPoolInfoFromRpc(poolId);
const { poolInfo, poolKeys, rpcData } = poolData;

// Compute swap amount
const swapAmount = new BN(0.01 * 1e9); // 0.01 SOL
const baseIn = true; // Swapping from mintA to mintB
const slippage = 0.01; // 1% slippage

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
  amountIn: swapAmount,
  outputMint: poolInfo.mintB.address,
  slippage,
  swapBaseIn: true,
});

// Execute swap
const { execute } = await raydium.cpmm.swap({
  poolInfo,
  poolKeys,
  inputAmount: swapAmount,
  baseIn,
  fixedOut: false,
  swapResult: {
    inputAmount: swapAmount,
    outputAmount: swapCompute.minAmountOut,
  },
  slippage,
  txVersion: TxVersion.V0,
});

const { txId } = await execute({ sendAndConfirm: true });
```

## Solayer Network Configuration

### RPC Endpoints

- **Devnet**: `https://devnet-rpc.solayer.org`
- **Mainnet**: `https://rpc.solayer.org` (or your mainnet RPC)

### Cluster Names

- `"solayer-devnet"` - Solayer devnet
- `"solayer"` - Solayer mainnet

### Program IDs

The SDK automatically uses the correct program IDs for Solayer:

```typescript
import { getProgramIdConfig } from "@solayer-labs/cpmm-sdk/common/programId";

const config = getProgramIdConfig("solayer-devnet");
console.log("CPMM Program:", config.CREATE_CPMM_POOL_PROGRAM.toBase58());
console.log("CPMM Auth:", config.CREATE_CPMM_POOL_AUTH.toBase58());
console.log("Pool Fee Account:", config.CREATE_CPMM_POOL_FEE_ACC.toBase58());
```

## Features

### Supported

- **CPMM Pool Creation** - Create new liquidity pools
- **Token Swaps** - Swap tokens through CPMM pools
- **Add/Remove Liquidity** - Manage liquidity positions
- **RPC-Only Operation** - No API dependencies, works directly with Solayer RPC
- **Pool Information** - Fetch pool data from on-chain accounts

### Not Supported

- API-based operations (Solayer doesn't support Raydium API)
- Farm/staking functionality
- CLMM (Concentrated Liquidity)
- Other Raydium modules (only CPMM is supported on Solayer)

## API Reference

### Core Classes

#### Raydium

Main SDK class for interacting with CPMM on Solayer.

```typescript
class Raydium {
  static async load(config: RaydiumLoadParams): Promise<Raydium>;

  // Modules
  cpmm: Cpmm;
  account: Account;
  token: TokenModule;

  // Properties
  cluster: Cluster;
  connection: Connection;
}
```

#### Cpmm

CPMM-specific operations.

```typescript
class Cpmm {
  // Pool operations
  createPool<T>(params: CreateCpmmPoolParam<T>): Promise<MakeTxData<T>>;
  addLiquidity<T>(params: AddCpmmLiquidityParams<T>): Promise<MakeTxData<T>>;
  removeLiquidity<T>(params: RemoveCpmmLiquidityParams<T>): Promise<MakeTxData<T>>;

  // Swap operations
  swap<T>(params: CpmmSwapParams<T>): Promise<MakeTxData<T>>;
  computeSwapAmount(params: ComputeSwapAmountParams): SwapComputeResult;

  // Pool info
  getPoolInfoFromRpc(poolId: string): Promise<PoolInfoFromRpc>;
  getCpmmPoolKeys(poolId: string): Promise<CpmmKeys>;
  getRpcPoolInfo(poolId: string): Promise<CpmmParsedRpcData>;
}
```

## Examples

### Example: Create a Pool

See `test/solayer-create-pool.ts` for a complete example.

```bash
# Set your keypair
cp ~/.config/solana/id.json test/keypair.json

# Run the test
yarn test:create-pool
```

### Example: Swap Tokens

See `test/solayer-swap.ts` for a complete example.

```bash
# Set pool ID and keypair
POOL_ID=<pool-address> yarn test:swap
```

## Development

### Build

```bash
yarn build
```

### Run Tests

```bash
# Basic SDK test
yarn test:basic

# Create pool test
yarn test:create-pool

# Swap test
yarn test:swap
```

## Fork: Raydium SDK V2

This SDK is a **fork** of [Raydium SDK V2](https://github.com/raydium-io/raydium-sdk-V2) ([@raydium-io/raydium-sdk-v2](https://www.npmjs.com/package/@raydium-io/raydium-sdk-v2)), adapted specifically for the Solayer chain.

### Differences from upstream

1. **RPC-Only**: No API dependencies - all data is fetched directly from Solayer RPC (upstream uses Raydium API).
2. **CPMM Only**: Only Constant Product Market Maker pools are supported; CLMM, farms, and other modules were removed.
3. **Solayer-Specific**: Program IDs and network configuration target the Solayer chain (devnet/mainnet).
4. **Simplified**: Removed all code and modules not used for CPMM on Solayer.

## Links

- **NPM Package**: https://www.npmjs.com/package/@solayer-labs/cpmm-sdk
- **GitHub Repository**: https://github.com/solayer-labs/raydium-sdk-V2
- **Upstream (Raydium SDK V2)**: https://github.com/raydium-io/raydium-sdk-V2
- **Solayer Explorer**: https://explorer.solayer.org

## License

GPL-3.0
