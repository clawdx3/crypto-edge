import axios from 'axios';
import { WalletTokenHolding, IBalanceFetcher } from './balance-fetcher.interface';

/**
 * Solana balance fetcher via Helius or generic RPC.
 *
 * Uses getTokenAccountsByOwner RPC method to discover all SPL-token
 * accounts owned by the wallet, then parses balances.
 */
export class SolanaBalanceFetcher implements IBalanceFetcher {
  readonly chain = 'solana';
  private readonly rpcUrl: string;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl ?? 'https://api.mainnet-beta.solana.com';
  }

  async fetchHoldings(walletAddress: string): Promise<WalletTokenHolding[]> {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        walletAddress,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed', commitment: 'confirmed' },
      ],
    };

    const res = await axios.post(this.rpcUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const accounts = res.data?.result?.value as Array<{
      pubkey: string;
      account: {
        data: {
          parsed: {
            info: {
              mint: string;
              tokenAmount: {
                amount: string;
                decimals: number;
                uiAmount: number | null;
              };
            };
          };
        };
      };
    }> | undefined;

    if (!accounts) return [];

    const holdings: WalletTokenHolding[] = [];

    for (const acc of accounts) {
      const info = acc?.account?.data?.parsed?.info;
      if (!info) continue;

      const decimals = info.tokenAmount.decimals ?? 0;
      const balance = info.tokenAmount.uiAmount ?? Number(info.tokenAmount.amount) / Math.pow(10, decimals);

      holdings.push({
        tokenAddress: info.mint,
        symbol: undefined, // Solana metadata not available in base RPC
        rawBalance: info.tokenAmount.amount,
        decimals,
        balance,
        chain: this.chain,
      });
    }

    return holdings;
  }
}
