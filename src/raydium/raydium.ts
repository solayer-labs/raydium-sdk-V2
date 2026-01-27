import { Connection, Keypair, PublicKey, EpochInfo, Commitment } from "@solana/web3.js";
import { merge } from "lodash";

import { EMPTY_CONNECTION, EMPTY_OWNER } from "../common/error";
import { createLogger, Logger } from "../common/logger";
import { Owner } from "../common/owner";
import { Cluster } from "../solana";

import Account, { TokenAccountDataProp } from "./account/account";
import Cpmm from "./cpmm/cpmm";
import TokenModule from "./token/token";
import { SignAllTransactions } from "./type";

export interface RaydiumLoadParams extends TokenAccountDataProp {
  /* ================= solana ================= */
  // solana web3 connection
  connection: Connection;
  // solana cluster/network/env
  cluster?: Cluster;
  // user public key
  owner?: PublicKey | Keypair;
  signAllTransactions?: SignAllTransactions;
  blockhashCommitment?: Commitment;
  loopMultiTxStatus?: boolean;
}

export interface RaydiumConstructorParams extends RaydiumLoadParams {
  cluster: Cluster;
}

export class Raydium {
  public cluster: Cluster;
  public account: Account;
  public cpmm: Cpmm;
  public token: TokenModule;
  public rawBalances: Map<string, string> = new Map();
  public blockhashCommitment: Commitment;
  public loopMultiTxStatus?: boolean;

  private _connection: Connection;
  private _owner: Owner | undefined;
  private _signAllTransactions?: SignAllTransactions;
  private logger: Logger;
  private _chainTime?: {
    fetched: number;
    value: {
      chainTime: number;
      offset: number;
    };
  };
  private _epochInfo?: {
    fetched: number;
    value: EpochInfo;
  };

  constructor(config: RaydiumConstructorParams) {
    const {
      connection,
      cluster,
      owner,
      blockhashCommitment = "confirmed",
      loopMultiTxStatus,
    } = config;

    this._connection = connection;
    this.cluster = cluster || "solayer";
    this._owner = owner ? new Owner(owner) : undefined;
    this._signAllTransactions = config.signAllTransactions;
    this.blockhashCommitment = blockhashCommitment;
    this.loopMultiTxStatus = loopMultiTxStatus;

    this.logger = createLogger("Raydium");
    this.account = new Account({
      scope: this,
      moduleName: "Raydium_Account",
      tokenAccounts: config.tokenAccounts,
      tokenAccountRawInfos: config.tokenAccountRawInfos,
    });
    this.token = new TokenModule({ scope: this, moduleName: "Raydium_tokenV2" });
    this.cpmm = new Cpmm({ scope: this, moduleName: "Raydium_cpmm" });

    // Initialize chain time with local time for Solayer
    this._chainTime = {
      fetched: Date.now(),
      value: {
        chainTime: Date.now(),
        offset: 0,
      },
    };
  }

  static async load(config: RaydiumLoadParams): Promise<Raydium> {
    const custom: RaydiumConstructorParams = {
      ...config,
      cluster: config.cluster || "solayer",
    };

    const raydium = new Raydium(custom);
    return raydium;
  }

  get owner(): Owner | undefined {
    return this._owner;
  }
  get ownerPubKey(): PublicKey {
    if (!this._owner) throw new Error(EMPTY_OWNER);
    return this._owner.publicKey;
  }
  public setOwner(owner?: PublicKey | Keypair): Raydium {
    this._owner = owner ? new Owner(owner) : undefined;
    this.account.resetTokenAccounts();
    return this;
  }
  get connection(): Connection {
    if (!this._connection) throw new Error(EMPTY_CONNECTION);
    return this._connection;
  }
  public setConnection(connection: Connection): Raydium {
    this._connection = connection;
    return this;
  }
  get signAllTransactions(): SignAllTransactions | undefined {
    return this._signAllTransactions;
  }
  public setSignAllTransactions(signAllTransactions?: SignAllTransactions): Raydium {
    this._signAllTransactions = signAllTransactions;
    return this;
  }

  public checkOwner(): void {
    if (!this.owner) {
      console.error(EMPTY_OWNER);
      throw new Error(EMPTY_OWNER);
    }
  }

  /**
   * Check if the current cluster is a Solayer cluster
   */
  public isSolayerCluster(): boolean {
    return this.cluster === "solayer" || this.cluster === "solayer-devnet";
  }

  get chainTimeData(): { offset: number; chainTime: number } | undefined {
    return this._chainTime?.value;
  }

  public async chainTimeOffset(): Promise<number> {
    return this._chainTime?.value.offset || 0;
  }

  public async currentBlockChainTime(): Promise<number> {
    return this._chainTime?.value.chainTime || Date.now();
  }

  public async fetchEpochInfo(): Promise<EpochInfo> {
    if (this._epochInfo && Date.now() - this._epochInfo.fetched <= 1000 * 30) return this._epochInfo.value;
    this._epochInfo = {
      fetched: Date.now(),
      value: await this.connection.getEpochInfo(),
    };
    return this._epochInfo.value;
  }
}
