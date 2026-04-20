import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Scan for trending meme coins on Solana/Bitcoin/ETH
 * Uses DexScreener's token boosting data.
 */
@Injectable()
export class MemeCoinScanner {
  private readonly logger = new Logger(MemeCoinScanner.name);

  private readonly knownMemeChains = ['solana', 'base', 'bitcoin'];

  async scanTrendingMemeCoins(): Promise<any[]> {
    const allGems: any[] = [];

    for (const chain of this.knownMemeChains) {
      try {
        // DexScreener token boosts endpoint shows trending tokens
        const { data } = await axios.get(
          `https://api.dexscreener.com/token-boosts/top/v1/${chain}`,
          { timeout: 10_000 },
        );
        const pairs = data?.pairs ?? [];

        // Filter for meme-like tokens (high volatility, low market cap)
        const memes = pairs
          .filter((p: any) => {
            const mc = parseFloat(p.marketCap ?? '0');
            const vol = parseFloat(p.volume24h ?? '0');
            const change = parseFloat(p.priceChange?.h24 ?? '0');
            // Meme criteria: sub $5M cap, $10K+ vol, 10%+ move
            return mc < 5_000_000 && mc > 0 && vol > 10_000 && Math.abs(change) > 10;
          })
          .slice(0, 10);

        allGems.push(...memes.map((p: any) => ({ ...p, chain })));
      } catch (err: any) {
        this.logger.warn(`Meme scan failed for ${chain}: ${err.message}`);
      }
    }

    return allGems;
  }
}
