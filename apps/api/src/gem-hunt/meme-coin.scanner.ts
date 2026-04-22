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
        // DexScreener token boosts endpoint shows trending tokens (all chains)
        const { data } = await axios.get(
          `https://api.dexscreener.com/token-boosts/top/v1`,
          { timeout: 10_000 },
        );
        const items: any[] = data ?? [];

        // Filter for meme-like tokens (high volatility, low market cap)
        // Token-boosts data is lightweight; we can't filter by MC yet here.
        const memes = items
          .filter((t: any) => {
            const chainId = (t.chainId ?? '').toLowerCase();
            return chainId === chain.toLowerCase();
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
