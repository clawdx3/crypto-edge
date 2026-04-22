export interface WalletTokenHolding {
  /** Token contract / mint address */
  tokenAddress: string;
  /** Human-readable symbol (e.g. "USDC") */
  symbol?: string;
  /** Raw balance string (unscaled) */
  rawBalance: string;
  /** Decimals (default 0) */
  decimals: number;
  /** Computed human balance */
  balance: number;
  /** Chain identifier */
  chain: string;
}

export interface IBalanceFetcher {
  readonly chain: string;
  fetchHoldings(walletAddress: string): Promise<WalletTokenHolding[]>;
}
