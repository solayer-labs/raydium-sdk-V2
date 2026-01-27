import { Token, TokenProps } from "../../module/token";

export type TransferFeeDataBaseType = {
  transferFeeConfigAuthority: string;
  withdrawWithheldAuthority: string;
  withheldAmount: string;
  olderTransferFee: {
    epoch: string;
    maximumFee: string;
    transferFeeBasisPoints: number;
  };
  newerTransferFee: {
    epoch: string;
    maximumFee: string;
    transferFeeBasisPoints: number;
  };
};

export type ExtensionsItem = {
  coingeckoId?: string;
  feeConfig?: TransferFeeDataBaseType;
  tips?: {
    icon: string;
    link: string;
    text: string;
  };
};

export type TokenInfo = {
  chainId: number;
  address: string;
  programId: string;
  logoURI: string;
  symbol: string;
  name: string;
  decimals: number;
  tags: string[];
  extensions: ExtensionsItem;
  freezeAuthority?: string;
  mintAuthority?: string;
  priority: number;
  userAdded?: boolean;
  type?: string;
};

export interface TokenJson {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  extensions: {
    coingeckoId?: string;
  };
  icon: string;
  hasFreeze?: boolean;
}

export type SplToken = TokenProps & {
  icon: string;
  id: string;
  extensions: {
    [key in "coingeckoId" | "website" | "whitepaper"]?: string;
  };
  userAdded?: boolean;
};

export type LpToken = Token & {
  isLp: true;
  base: SplToken;
  quote: SplToken;
  icon: string;
  id: string;
  extensions: {
    [key in "coingeckoId" | "website" | "whitepaper"]?: string;
  };
};
