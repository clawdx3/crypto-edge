import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface NormalizedPair {
  address: string;
  chainId: string;
  dexId: string;
  name?: string;
  symbol?: string;
  priceUsd?: string;
  marketCap?: string;
  fdv?: string;
  liquidity?: string;
  volume24h?: string;
  priceChange?: { h24?: string };
  txns?: { h24?: { buys: number; sells: number } };  
  url?: string;
  pairAddress?: string;
  pairCreatedAt?: number;
}

/**
 * Scan for trending meme coins on Solana/Base/Bitcoin.
 * Uses DexScreener v3 /latest/dex/search and ranks by meme-like signals:
 * - high volume-to-market-cap ratio (virality signal)
 * - small market cap (< $10M)
 * - high recent volatility (1h price change)
 * - high buy pressure / sell ratio
 * - recently created pairs (last 7-30 days)
 */
@Injectable()
export class MemeCoinScanner {
  private readonly logger = new Logger(MemeCoinScanner.name);
  private readonly dexScreenerBase = 'https://api.dexscreener.com';
  private readonly knownMemeChains = ['solana', 'base', 'bitcoin'];

  async scanTrendingMemeCoins(): Promise<any[]> {
    const allMemes: any[] = [];
    const broadKeywords = ['SOL', 'USDC', 'TOKEN', 'MEME', 'WIF', 'BONK', 'WETH'];

    for (const chain of this.knownMemeChains) {
      const seenPairs = new Map<string, any>();

      await Promise.all(
        broadKeywords.map(async (q) => {
          try {
            const { data } = await axios.get(
              `${this.dexScreenerBase}/latest/dex/search?q=${encodeURIComponent(q)}&chain=${chain}`,
              { timeout: 10_000 },
            );
            const pairs: any[] = data?.pairs ?? [];
            for (const p of pairs) {
              const key = p.pairAddress ?? `${p.chainId ?? chain}-${p.baseToken?.address ?? p.address}`;
              if (!seenPairs.has(key)) seenPairs.set(key, p);
            }
          } catch { /* ignore */ }
        }),
      );

      const scoredPairs = Array.from(seenPairs.values())
        .map((p) => {
          const normalized = this.normalizePair(p, chain);
          return {
            ...normalized,
            memeScore: this.calculateMemeScore(p, normalized),
          };
        })
        .filter((s) => s.memeScore > 30)
        .sort((a, b) => b.memeScore - a.memeScore);

      allMemes.push(...scoredPairs.slice(0, 10));
    }

    // Deduplicate by address
    const seen = new Set<string>();
    return allMemes.filter((m) => {
      const key = `${m.chainId}:${m.address}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private normalizePair(p: any, chain: string): NormalizedPair {
    return {
      address: p.baseToken?.address ?? p.address ?? '',
      chainId: p.chainId ?? chain,
      dexId: p.dexId ?? 'unknown',
      name: p.baseToken?.name ?? p.name ?? '',
      symbol: p.baseToken?.symbol ?? p.symbol ?? '',
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
      pairCreatedAt: p.pairCreatedAt ?? 0,
    };
  }

  /**
   * Score how "meme-like" a token is.
   * Meme formula = (vol24h / marketCap) * volatility * buyPressure * recency
   */
  private calculateMemeScore(raw: any, normalized: NormalizedPair): number {
    const mc = parseFloat(normalized.marketCap ?? '0');
    const liq = parseFloat(normalized.liquidity ?? '0');
    const vol24h = parseFloat(normalized.volume24h ?? '0');
    
    // Skip dead tokens
    if (mc <= 0 || liq < 5_000 || vol24h < 5_000) return 0;
    // Skip already-mature tokens
    if (mc > 10_000_000) return 0;

    let score = 0;

    // Volume-to-MarketCap ratio — the meme virality metric (heaviest weight)
    const volRatio = vol24h / mc;
    if (volRatio > 1.0) score += 35;
    else if (volRatio > 0.5) score += 30;
    else if (volRatio > 0.2) score += 25;
    else if (volRatio > 0.1) score += 15;
    else score += 5;

    // Volatility (1h + 24h momentum)
    const priceChangeH1 = Math.abs(parseFloat(raw.priceChange?.h1 ?? '0'));
    const priceChange24h = Math.abs(parseFloat(raw.priceChange?.h24 ?? '0'));
    if (priceChangeH1 > 20 || priceChange24h > 50) score += 25;
    else if (priceChangeH1 > 10 || priceChange24h > 25) score += 20;
    else if (priceChangeH1 > 5 || priceChange24h > 10) score += 10;

    // Buy pressure (higher = more FOMO)
    const buysH1 = raw.txns?.h1?.buys ?? 0;
    const sellsH1 = raw.txns?.h1?.sells ?? 1;
    const ratio = buysH1 / sellsH1;
    if (ratio > 2) score += 20;
    else if (ratio > 1.2) score += 10;

    // Recency bonus
    if (normalized.pairCreatedAt) {
      const ageDays = (Date.now() - normalized.pairCreatedAt) / (1000 * 60 * 60 * 24);
      if (ageDays < 3) score += 15;
      else if (ageDays < 7) score += 10;
      else if (ageDays < 30) score += 5;
    }

    // Liquidity quality (need enough to trade but not so deep it's a blue-chip)
    if (liq > 100_000) score += 5;

    return Math.min(100, score);
  }
}
