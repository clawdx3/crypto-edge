import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { GemHuntScanner, DexScreenerToken } from './gem-hunt.scanner';

export interface CoinGeckoCoin {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number | null;
  thumb: string;
  large: string;
}

export interface TrendingCoinResult {
  coingeckoCoin: CoinGeckoCoin;
  dexPair: DexScreenerToken | null;
  upsidePotential: number; // ratio: dex MC / coingecko MC
  signalStrength: number; // 0-100
  isPrePumpGem: boolean; // true if DexScreener MC < $1M but trending
}

@Injectable()
export class CoinGeckoScanner {
  private readonly logger = new Logger(CoinGeckoScanner.name);
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: GemHuntScanner,
  ) {}

  /**
   * Fetch trending coins from CoinGecko (no API key needed).
   * Returns top trending coins with name, symbol, market cap rank, thumbnail.
   */
  async getTrendingCoins(): Promise<CoinGeckoCoin[]> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/search/trending`, {
        timeout: 15_000,
      });

      const coins: CoinGeckoCoin[] = (data?.coins ?? []).map((item: any) => ({
        id: item.item?.id ?? '',
        name: item.item?.name ?? '',
        symbol: item.item?.symbol ?? '',
        marketCapRank: item.item?.marketCapRank ?? null,
        thumb: item.item?.thumb ?? '',
        large: item.item?.large ?? '',
      })).filter((c: CoinGeckoCoin) => c.id && c.symbol);

      this.logger.log(`CoinGecko: fetched ${coins.length} trending coins`);
      return coins;
    } catch (err: any) {
      this.logger.warn(`CoinGecko trending fetch failed: ${err.message}`);
      return [];
    }
  }

  /**
   * For each trending coin, search DexScreener by symbol to find the DEX pair.
   * Flag as "pre-pump gem" if trending coin has MC < $1M on DexScreener.
   */
  async findGemsOnDexScreener(trendingCoins: CoinGeckoCoin[]): Promise<TrendingCoinResult[]> {
    const results: TrendingCoinResult[] = [];

    for (const coin of trendingCoins) {
      try {
        // Search DexScreener by symbol
        const pairs = await this.scanner.searchBySymbol(coin.symbol, 'solana');

        if (pairs.length === 0) {
          // Try searching by keyword on DexScreener
          continue;
        }

        // Pick the best pair (highest liquidity)
        const bestPair = pairs.reduce((best, p) => {
          const bestLiq = parseFloat(best.liquidity ?? '0');
          const pLiq = parseFloat(p.liquidity ?? '0');
          return pLiq > bestLiq ? p : best;
        }, pairs[0]!);

        const dexMarketCap = parseFloat(bestPair.marketCap ?? '0');
        const upsidePotential = dexMarketCap > 0 ? dexMarketCap / 1_000_000 : 0; // relative to $1M threshold
        const isPrePumpGem = dexMarketCap < 1_000_000;

        // Calculate signal strength (0-100)
        // Higher if: trending on CG, low MC on DEX, good liquidity
        let signalStrength = 30; // base
        if (coin.marketCapRank && coin.marketCapRank <= 100) signalStrength += 25;
        else if (coin.marketCapRank && coin.marketCapRank <= 500) signalStrength += 15;
        if (isPrePumpGem) signalStrength += 20;
        if (parseFloat(bestPair.liquidity ?? '0') > 10_000) signalStrength += 15;
        if (parseFloat(bestPair.volume24h ?? '0') > 5_000) signalStrength += 10;

        signalStrength = Math.min(100, signalStrength);

        results.push({
          coingeckoCoin: coin,
          dexPair: bestPair ?? null,
          upsidePotential,
          signalStrength,
          isPrePumpGem,
        });

        // Store in DB
        await this.storeCoinGeckoGem({
          coingeckoId: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          marketCapRank: coin.marketCapRank,
          dexPairAddress: bestPair.address,
          dexPairChain: 'solana',
          dexMarketCap: dexMarketCap,
          upsidePotential,
          signalStrength,
        });
      } catch (err: any) {
        this.logger.warn(`Failed to find DexScreener pair for ${coin.symbol}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Full pipeline: fetch trending → find DEX pairs → return pre-pump gems.
   * Wired into GemHuntService to run after TrendRadar, before DexScreener scan.
   */
  async scanTrendingGems(): Promise<TrendingCoinResult[]> {
    const trending = await this.getTrendingCoins();
    if (trending.length === 0) return [];

    const results = await this.findGemsOnDexScreener(trending);

    // Filter to only pre-pump gems (low DEX MC but trending on CG)
    const gems = results.filter((r) => r.isPrePumpGem);
    this.logger.log(`CoinGecko: found ${gems.length} pre-pump gems out of ${results.length} trending`);

    return gems;
  }

  private async storeCoinGeckoGem(data: {
    coingeckoId: string;
    symbol: string;
    name: string;
    marketCapRank: number | null;
    dexPairAddress: string;
    dexPairChain: string;
    dexMarketCap: number;
    upsidePotential: number;
    signalStrength: number;
  }): Promise<void> {
    try {
      await this.prisma.coinGeckoGem.upsert({
        where: { coingeckoId: data.coingeckoId },
        update: {
          marketCapRank: data.marketCapRank,
          dexPairAddress: data.dexPairAddress,
          dexPairChain: data.dexPairChain,
          dexMarketCap: data.dexMarketCap,
          upsidePotential: data.upsidePotential,
          signalStrength: data.signalStrength,
        },
        create: {
          coingeckoId: data.coingeckoId,
          symbol: data.symbol,
          name: data.name,
          marketCapRank: data.marketCapRank,
          dexPairAddress: data.dexPairAddress,
          dexPairChain: data.dexPairChain,
          dexMarketCap: data.dexMarketCap,
          upsidePotential: data.upsidePotential,
          signalStrength: data.signalStrength,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to store CoinGecko gem: ${err.message}`);
    }
  }
}
