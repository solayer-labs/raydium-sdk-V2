import { PublicKey } from "@solana/web3.js";
import { MintLayout, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import ModuleBase, { ModuleBaseProps } from "../moduleBase";

import { SOL_INFO } from "./constant";
import { TokenInfo } from "./type";

export default class TokenModule extends ModuleBase {
  private _tokenMap: Map<string, TokenInfo> = new Map();
  private _mintGroup: { extra: Set<string> } = {
    extra: new Set(),
  };

  constructor(params: ModuleBaseProps) {
    super(params);
    // Initialize with SOL info
    this._tokenMap.set(SOL_INFO.address, SOL_INFO);
  }

  get tokenMap(): Map<string, TokenInfo> {
    return this._tokenMap;
  }

  get mintGroup(): { extra: Set<string> } {
    return this._mintGroup;
  }

  /** === util functions === */

  public async getTokenInfo(mint: string | PublicKey): Promise<TokenInfo> {
    if (!mint) throw new Error("please input mint");
    const mintStr = mint.toString();
    const info = this._tokenMap.get(mintStr);
    if (info) return info;
    if (mintStr.toLocaleUpperCase() === "SOL") return SOL_INFO;

    // Fetch from RPC
    const onlineInfo = await this.scope.connection.getAccountInfo(new PublicKey(mintStr));
    if (!onlineInfo) throw new Error(`mint address not found: ${mintStr}`);
    const data = MintLayout.decode(new Uint8Array(onlineInfo.data));
    const mintSymbol = mintStr.toString().substring(0, 6);
    const fullInfo: TokenInfo = {
      chainId: 101,
      address: mintStr,
      programId: onlineInfo.owner.toBase58(),
      logoURI: "",
      symbol: mintSymbol,
      name: mintSymbol,
      decimals: data.decimals,
      tags: [],
      extensions: {},
      priority: 0,
      type: "unknown",
    };
    this._mintGroup.extra.add(mintStr);
    this._tokenMap.set(mintStr, fullInfo);
    return fullInfo;
  }
}

export function toApiV3Token(token: Pick<TokenInfo, "address" | "decimals" | "programId" | "extensions">): TokenInfo {
  return {
    chainId: 101,
    address: token.address,
    programId: token.programId ?? TOKEN_PROGRAM_ID.toBase58(),
    logoURI: "",
    symbol: token.address.substring(0, 6),
    name: token.address.substring(0, 6),
    decimals: token.decimals,
    tags: [],
    extensions: token.extensions || {},
    priority: 0,
    type: "unknown",
  };
}

export function toFeeConfig(feeConfig: any) {
  return feeConfig;
}
