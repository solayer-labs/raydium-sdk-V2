import { PublicKey } from "@solana/web3.js";
import { Cluster } from "../solana/type";

/* ================= CPMM Program IDs ================= */

// Solana Mainnet CPMM
export const CREATE_CPMM_POOL_PROGRAM = new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C");
export const CREATE_CPMM_POOL_AUTH = new PublicKey("GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL");
export const CREATE_CPMM_POOL_FEE_ACC = new PublicKey("DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8");

export const LOCK_CPMM_PROGRAM = new PublicKey("LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE");
export const LOCK_CPMM_AUTH = new PublicKey("3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH");

/* ================= CPMM Config Type ================= */

export interface CpmmProgramConfig {
  CREATE_CPMM_POOL_PROGRAM: PublicKey;
  CREATE_CPMM_POOL_AUTH: PublicKey;
  CREATE_CPMM_POOL_FEE_ACC: PublicKey;
  LOCK_CPMM_PROGRAM: PublicKey;
  LOCK_CPMM_AUTH: PublicKey;
}

/* ================= Solana Mainnet Config ================= */

export const MAINNET_PROGRAM_ID: CpmmProgramConfig = {
  CREATE_CPMM_POOL_PROGRAM: new PublicKey("CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"),
  CREATE_CPMM_POOL_AUTH: new PublicKey("GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL"),
  CREATE_CPMM_POOL_FEE_ACC: new PublicKey("DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8"),
  LOCK_CPMM_PROGRAM: new PublicKey("LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE"),
  LOCK_CPMM_AUTH: new PublicKey("3f7GcQFG397GAaEnv51zR6tsTVihYRydnydDD1cXekxH"),
};

/* ================= Solana Devnet Config ================= */

export const DEVNET_PROGRAM_ID: CpmmProgramConfig = {
  CREATE_CPMM_POOL_PROGRAM: new PublicKey("DRaycpLY18LhpbydsBWbVJtxpNv9oXPgjRSfpF2bWpYb"),
  CREATE_CPMM_POOL_AUTH: new PublicKey("CXniRufdq5xL8t8jZAPxsPZDpuudwuJSPWnbcD5Y5Nxq"),
  CREATE_CPMM_POOL_FEE_ACC: new PublicKey("3oE58BKVt8KuYkGxx8zBojugnymWmBiyafWgMrnb6eYy"),
  LOCK_CPMM_PROGRAM: new PublicKey("DRay25Usp3YJAi7beckgpGUC7mGJ2cR1AVPxhYfwVCUX"),
  LOCK_CPMM_AUTH: new PublicKey("7qWVV8UY2bRJfDLP4s37YzBPKUkVB46DStYJBpYbQzu3"),
};

/* ================= Solayer Config ================= */

/**
 * Solayer Mainnet/Devnet Program IDs
 * These are your deployed CPMM program addresses on Solayer
 */
export const SOLAYER_PROGRAM_ID: CpmmProgramConfig = {
  CREATE_CPMM_POOL_PROGRAM: new PublicKey("GY4LY84aeT3iqRNRUg9ZJzHRtZgGGKtYSJm4Rrsd3VVu"),
  CREATE_CPMM_POOL_AUTH: new PublicKey("9czkSX1oTbptxgfLraxqwLCZT9rUj8R3LYw2srf46oU"),
  CREATE_CPMM_POOL_FEE_ACC: new PublicKey("ZoM2kNscRM5LwBdCHkWVws8L69PBX8gEA5pZgCabWk5"), // EHkKX6kv3kgoPJ7QfviUx8pPPRFcR7EJkXVTS9BzZJ54
  LOCK_CPMM_PROGRAM: PublicKey.default, // Update if you deploy lock program
  LOCK_CPMM_AUTH: PublicKey.default, // Update if you deploy lock program
};

export const SOLAYER_DEVNET_PROGRAM_ID: CpmmProgramConfig = {
  CREATE_CPMM_POOL_PROGRAM: new PublicKey("GY4LY84aeT3iqRNRUg9ZJzHRtZgGGKtYSJm4Rrsd3VVu"),
  CREATE_CPMM_POOL_AUTH: new PublicKey("9czkSX1oTbptxgfLraxqwLCZT9rUj8R3LYw2srf46oU"),
  CREATE_CPMM_POOL_FEE_ACC: new PublicKey("ZoM2kNscRM5LwBdCHkWVws8L69PBX8gEA5pZgCabWk5"), // EHkKX6kv3kgoPJ7QfviUx8pPPRFcR7EJkXVTS9BzZJ54
  LOCK_CPMM_PROGRAM: PublicKey.default, // Update if you deploy lock program
  LOCK_CPMM_AUTH: PublicKey.default, // Update if you deploy lock program
};

/* ================= Helper Functions ================= */

/**
 * Get program IDs based on cluster
 */
export function getProgramIdConfig(cluster: Cluster): CpmmProgramConfig {
  switch (cluster) {
    case "solayer":
      return SOLAYER_PROGRAM_ID;
    case "solayer-devnet":
      return SOLAYER_DEVNET_PROGRAM_ID;
    case "devnet":
      return DEVNET_PROGRAM_ID;
    case "mainnet":
    default:
      return MAINNET_PROGRAM_ID;
  }
}

/**
 * Check if cluster is a Solayer cluster
 */
export function isSolayerCluster(cluster: Cluster): boolean {
  return cluster === "solayer" || cluster === "solayer-devnet";
}

/**
 * Check if a program ID is a CPMM program across any cluster
 */
export function isCpmmProgram(programId: string | PublicKey): boolean {
  const id = typeof programId === "string" ? programId : programId.toBase58();
  return (
    id === MAINNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM.toBase58() ||
    id === DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM.toBase58() ||
    id === SOLAYER_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM.toBase58() ||
    id === SOLAYER_DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM.toBase58()
  );
}
