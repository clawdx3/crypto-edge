import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface DexScreenerToken {
  address: string;
  chainId: string;
  dexId: string;
  name?: string;
  symbol?: string;
  quoteTokenAddress?: string;
  priceUsd?: string;
  marketCap?: string;
  fdv?: string;
  liquidity?: string;
  volume24h?: string;
  priceChange?: { h24?: string };
  txns?: { h24?: { buys: number; sells: number } };
  url?: string;
  pairAddress?: string;
  holderCount?: string;
  launches?: string;
}

@Injectable()
export class GemHuntScanner {
  private readonly logger = new Logger(GemHuntScanner.name);
  private readonly dexScreenerBase = 'https://api.dexscreener.com';

  /**
   * Scan DexScreener for latest pairs on a chain.
   * Returns tokens matching gem criteria.
   */
  async scanForGems(chain: string = 'solana'): Promise<DexScreenerToken[]> {
    try {
      const response = await axios.get(
        `${this.dexScreenerBase}/latest/dex/search?q=&chain=${chain}`,
        { timeout: 10000 },
      );
      const pairs: any[] = response.data?.pairs ?? [];

      return pairs
        .map((p) => this.normalizePair(p, chain))
        .filter((pair) => {
          const marketCap = parseFloat(pair.marketCap ?? '0');
          const liquidity = parseFloat(pair.liquidity ?? '0');
          const volume24h = parseFloat(pair.volume24h ?? '0');
          const priceChange24h = parseFloat(pair.priceChange?.h24 ?? '0');
          const holderCount = parseInt(pair.holderCount ?? '0', 10);

          // Gem filters
          if (marketCap < 1_000) return false;       // Too micro
          if (marketCap > 5_000_000) return false;    // Already big
          if (liquidity < 5_000) return false;        // Too illiquid
          if (volume24h < 5_000) return false;        // No volume
          if (priceChange24h < -50) return false;     // Dumping hard
          if (holderCount > 0 && holderCount < 5) return false; // Ghost token

          return true;
        });
    } catch (err: any) {
      this.logger.warn(`DexScreener scan failed for ${chain}: ${err.message}`);
      return [];
    }
  }

  /**
   * Calculate a gem score (0-100) based on multiple signals.
   */
  calculateGemScore(token: DexScreenerToken): number {
    let score = 0;

    // Market cap signal (lower cap = higher upside potential) — max 25 pts
    const marketCap = parseFloat(token.marketCap ?? '0');
    if (marketCap < 50_000) score += 25;
    else if (marketCap < 200_000) score += 20;
    else if (marketCap < 1_000_000) score += 15;
    else score += 10;

    // Liquidity signal — max 25 pts
    const liquidity = parseFloat(token.liquidity ?? '0');
    if (liquidity > 100_000) score += 25;
    else if (liquidity > 50_000) score += 20;
    else if (liquidity > 20_000) score += 15;
    else score += 10;

    // Volume signal — max 25 pts
    const volume24h = parseFloat(token.volume24h ?? '0');
    if (volume24h > 200_000) score += 25;
    else if (volume24h > 100_000) score += 20;
    else if (volume24h > 50_000) score += 15;
    else score += 10;

    // Price momentum — max 15 pts
    const priceChange = parseFloat(token.priceChange?.h24 ?? '0');
    if (priceChange > 50) score += 15;
    else if (priceChange > 20) score += 10;
    else if (priceChange > 0) score += 5;
    else score -= 10; // Penalty for red

    // Buy/sell ratio — max 10 pts
    const buys = token.txns?.h24?.buys ?? 0;
    const sells = token.txns?.h24?.sells ?? 1;
    const buySellRatio = buys / sells;
    if (buySellRatio > 5) score += 10;
    else if (buySellRatio > 2) score += 7;
    else if (buySellRatio > 1) score += 4;
    else score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Normalize a raw DexScreener v3 API pair into our DexScreenerToken interface.
   * The v3 API has a different shape: liquidity.usd, volume.h24, baseToken, etc.
   */
  private normalizePair(p: any, chain: string): DexScreenerToken {
    return {
      address: p.baseToken?.address ?? p.address ?? '',
      chainId: p.chainId ?? chain,
      dexId: p.dexId ?? 'unknown',
      name: p.baseToken?.name ?? p.name ?? '',
      symbol: p.baseToken?.symbol ?? p.symbol ?? '',
      quoteTokenAddress: p.quoteToken?.address ?? '',
      priceUsd: p.priceUsd ?? '0',
      marketCap: String(p.marketCap ?? p.fdv ?? 0),
      fdv: String(p.fdv ?? 0),
      liquidity: String(p.liquidity?.usd ?? p.liquidity ?? 0),
      volume24h: String(p.volume?.h24 ?? p.volume24h ?? 0),
      priceChange: {
        h24: String(p.priceChange?.h24 ?? 0),
      },
      txns: {
        h24: {
          buys: p.txns?.h24?.buys ?? 0,
          sells: p.txns?.h24?.sells ?? 0,
        },
      },
      url: p.url ?? `https://dexscreener.com/${p.chainId ?? chain}/${p.baseToken?.address ?? p.address ?? ''}`,
      pairAddress: p.pairAddress ?? p.address ?? '',
      holderCount: p.holderCount ?? '0',
    };
  }

  /**
   * Get trending tokens from DexScreener boosts endpoint.
   * Uses all-time boosts then filters to requested chain.
   */
  async getTrending(chain: string = 'solana', limit: number = 20): Promise<DexScreenerToken[]> {
    try {
      const response = await axios.get(
        `${this.dexScreenerBase}/token-boosts/top/v1`,
        { timeout: 10_000 },
      );
      const items: any[] = response.data ?? [];
      return items
        .filter((t) => !chain || (t.chainId ?? '').toLowerCase() === chain.toLowerCase())
        .slice(0, limit)
        .map((t) => ({
          address: t.tokenAddress ?? '',
          chainId: t.chainId ?? chain,
          dexId: 'unknown',
          name: '',
          symbol: '',
          quoteTokenAddress: '',
          priceUsd: '0',
          marketCap: '0',
          fdv: '0',
          liquidity: '0',
          volume24h: '0',
          priceChange: { h24: '0' },
          txns: { h24: { buys: 0, sells: 0 } },
          url: t.url ?? '',
          pairAddress: '',
          holderCount: '0',
        } as DexScreenerToken));
    } catch {
      return [];
    }
  }

  /**
   * Get newest pairs from DexScreener (sorted by creation time, newest first).
   * Uses the /latest/dex/search endpoint on a common keyword to get fresh pairs,
   * then sorts by pairCreatedAt descending.
   */
  async getNewestPairs(chain: string = 'solana', limit: number = 50): Promise<DexScreenerToken[]> {
    try {
      const response = await axios.get(
        `${this.dexScreenerBase}/latest/dex/search?q=&chain=${chain}`,
        { timeout: 10_000 },
      );
      const pairs: any[] = response.data?.pairs ?? [];

      return pairs
        .sort((a, b) => (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0))
        .slice(0, limit)
        .map((p) => this.normalizePair(p, chain));
    } catch (err: any) {
      this.logger.warn(`DexScreener getNewestPairs failed for ${chain}: ${err.message}`);
      return [];
    }
  }

  /**
   * Search DexScreener for pairs matching a symbol.
   * Uses the updated /latest/dex/search endpoint.
   */
  async searchBySymbol(symbol: string, chain: string = 'solana'): Promise<DexScreenerToken[]> {
    try {
      const { data } = await axios.get(
        `${this.dexScreenerBase}/latest/dex/search?q=${encodeURIComponent(symbol)}&chain=${chain}`,
        { timeout: 10_000 },
      );

      const pairs: any[] = data?.pairs ?? [];
      return pairs
        .filter((p) => {
          const mc = parseFloat(p.marketCap ?? p.fdv ?? 0);
          const liq = parseFloat(p.liquidity?.usd ?? 0);
          return mc > 0 && liq > 0;
        })
        .slice(0, 10)
        .map((p) => this.normalizePair(p, chain));
    } catch (err: any) {
      this.logger.warn(`DexScreener symbol search failed for "${symbol}": ${err.message}`);
      return [];
    }
  }
}
