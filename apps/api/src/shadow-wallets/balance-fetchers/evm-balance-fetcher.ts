import axios from 'axios';
import { WalletTokenHolding, IBalanceFetcher } from './balance-fetcher.interface';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

/**
 * Generic EVM balance fetcher via any JSON-RPC endpoint.
 *
 * Fetches native balance + a curated list of popular tokens
 * via balanceOf eth_call. Works with any free public RPC
 * (publicnode, ankr, cloudflare, etc.).
 */
export class EvmBalanceFetcher implements IBalanceFetcher {
  readonly chain: string;
  private readonly rpcUrl: string;

  /** Popular tokens per chain (address → symbol, decimals) */
  private readonly tokens: Map<string, { symbol: string; decimals: number }>;

  constructor(
    chain: string,
    rpcUrl: string,
    tokens?: Map<string, { symbol: string; decimals: number }>,
  ) {
    this.chain = chain;
    this.rpcUrl = rpcUrl;
    this.tokens = tokens ?? new Map();
  }

  async fetchHoldings(walletAddress: string): Promise<WalletTokenHolding[]> {
    const holdings: WalletTokenHolding[] = [];

    // 1. Native balance
    try {
      const native = await this.callRpc<string>('eth_getBalance', [walletAddress, 'latest']);
      if (native && !this.isZero(native)) {
        const balance = Number(native) / 1e18;
        holdings.push({
          tokenAddress: ZERO_ADDR,
          symbol: this.nativeSymbol(),
          rawBalance: native,
          decimals: 18,
          balance,
          chain: this.chain,
        });
      }
    } catch {
      // Native balance optional — don't fail entire call
    }

    // 2. Token balances via eth_call balanceOf
    const tokenAddresses = Array.from(this.tokens.keys());
    const balanceOfSelector = '70a08231000000000000000000000000';
    const addrNo0x = walletAddress.toLowerCase().replace(/^0x/, '');

    for (const tokenAddress of tokenAddresses) {
      try {
        const data = '0x' + balanceOfSelector + addrNo0x;
        const encoded = await this.callRpc<string>('eth_call', [
          { to: tokenAddress, data },
          'latest',
        ]);
        if (!encoded || encoded === '0x') continue;

        const raw = parseInt(encoded, 16);
        if (raw === 0) continue;

        const meta = this.tokens.get(tokenAddress)!;
        const balance = raw / Math.pow(10, meta.decimals);

        holdings.push({
          tokenAddress,
          symbol: meta.symbol,
          rawBalance: encoded,
          decimals: meta.decimals,
          balance,
          chain: this.chain,
        });
      } catch {
        // Skip individual token failures
      }
    }

    return holdings;
  }

  private isZero(raw: string): boolean {
    return !raw || raw === '0x' || parseInt(raw, 16) === 0;
  }

  private nativeSymbol(): string {
    switch (this.chain.toLowerCase()) {
      case 'ethereum':
        return 'ETH';
      case 'base':
        return 'ETH';
      case 'arbitrum':
        return 'ETH';
      case 'optimism':
        return 'ETH';
      case 'polygon':
      case 'matic':
        return 'MATIC';
      case 'bsc':
        return 'BNB';
      case 'avalanche':
        return 'AVAX';
      default:
        return this.chain.toUpperCase();
    }
  }

  private async callRpc<T>(method: string, params: unknown[]): Promise<T | undefined> {
    const res = await axios.post<RpcResponse<T>>(
      this.rpcUrl,
      { jsonrpc: '2.0', id: 1, method, params },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
    );
    if (res.data.error) throw new Error(res.data.error.message);
    return res.data.result;
  }
}
