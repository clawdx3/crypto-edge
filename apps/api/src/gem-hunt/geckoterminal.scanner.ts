import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface GeckoTerminalPool {
  poolAddress: string;
  network: string;
  token0Symbol: string | null;
  token1Symbol: string | null;
  token0Address: string | null;
  token1Address: string | null;
  volume24h: number;
  liquidity: number;
  price: number;
  isNew: boolean;
}

export interface GeckoTerminalToken {
  address: string;
  network: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
}

@Injectable()
export class GeckoTerminalScanner {
  private readonly logger = new Logger(GeckoTerminalScanner.name);
  private readonly baseUrl = 'https://api.geckoterminal.com/api';

  // Filter thresholds
  private readonly MIN_LIQUIDITY = 10_000;
  private readonly MIN_VOLUME = 5_000;
  private readonly MAX_MARKET_CAP = 2_000_000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get top pools by volume on a network.
   * GET /api/pools?network=solana&top_pools=true
   */
  async scanTopPools(network: string = 'solana'): Promise<GeckoTerminalPool[]> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/pools`, {
        params: { network, top_pools: true },
        timeout: 15_000,
      });

      const pools = this.parsePools(data?.data, network);
      const filtered = pools.filter(
        (p) =>
          p.liquidity >= this.MIN_LIQUIDITY &&
          p.volume24h >= this.MIN_VOLUME &&
          this.calcMarketCap(p) < this.MAX_MARKET_CAP,
      );

      this.logger.log(`GeckoTerminal: scanned top pools on ${network}, ${filtered.length} pass filters`);

      // Store in DB
      for (const pool of filtered) {
        await this.storePool(pool);
      }

      return filtered;
    } catch (err: any) {
      this.logger.warn(`GeckoTerminal top pools failed for ${network}: ${err.message}`);
      return [];
    }
  }

  /**
   * Get newest pools (fresh gems) on a network.
   * GeckoTerminal returns pools sorted by creation time when no special params.
   */
  async getNewPools(network: string, limit: number = 50): Promise<GeckoTerminalPool[]> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/pools`, {
        params: { network, per_page: limit },
        timeout: 15_000,
      });

      const pools = this.parsePools(data?.data, network);

      // New pools have low volume but fresh — we filter by age (isNew flag from API)
      const filtered = pools.filter(
        (p) =>
          p.isNew &&
          p.liquidity >= this.MIN_LIQUIDITY &&
          this.calcMarketCap(p) < this.MAX_MARKET_CAP,
      );

      this.logger.log(`GeckoTerminal: found ${filtered.length} new pools on ${network}`);

      for (const pool of filtered) {
        await this.storePool(pool);
      }

      return filtered;
    } catch (err: any) {
      this.logger.warn(`GeckoTerminal new pools failed for ${network}: ${err.message}`);
      return [];
    }
  }

  /**
   * Get full pool data for a specific token.
   * GET /api/tokens/{network}/{address}
   */
  async searchToken(network: string, tokenAddress: string): Promise<GeckoTerminalToken | null> {
    try {
      const { data } = await axios.get(
        `${this.baseUrl}/tokens/${network}/${tokenAddress}`,
        { timeout: 15_000 },
      );

      const attrs = data?.data?.attributes;
      if (!attrs) return null;

      return {
        address: tokenAddress,
        network,
        name: attrs.name ?? '',
        symbol: attrs.symbol ?? '',
        price: parseFloat(attrs.price_usd ?? '0'),
        marketCap: parseFloat(attrs.market_cap ?? '0'),
        volume24h: parseFloat(attrs.volume_24h ?? '0'),
      };
    } catch (err: any) {
      this.logger.warn(`GeckoTerminal token search failed for ${tokenAddress}: ${err.message}`);
      return null;
    }
  }

  /**
   * Get all available networks from GeckoTerminal.
   * GET /api/networks
   */
  async getNetworks(): Promise<string[]> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/networks`, { timeout: 10_000 });
      return (data?.data ?? []).map((n: any) => n.attributes?.name ?? n.id ?? '');
    } catch (err: any) {
      this.logger.warn(`GeckoTerminal networks fetch failed: ${err.message}`);
      return [];
    }
  }

  private parsePools(raw: any[], network: string): GeckoTerminalPool[] {
    if (!Array.isArray(raw)) return [];

    return raw.map((item: any) => {
      const attrs = item.attributes ?? {};
      const token0 = attrs.base_token ?? {};
      const token1 = attrs.quote_token ?? {};

      return {
        poolAddress: item.id ?? attrs.address ?? '',
        network,
        token0Symbol: token0.symbol ?? null,
        token1Symbol: token1.symbol ?? null,
        token0Address: token0.address ?? null,
        token1Address: token1.address ?? null,
        volume24h: parseFloat(attrs.volume_24h ?? '0'),
        liquidity: parseFloat(attrs.reserve_in_usd ?? attrs.liquidity ?? '0'),
        price: parseFloat(attrs.price ?? '0'),
        isNew: attrs.initialized ?? false, // pools are "new" if recently created
      };
    });
  }

  private calcMarketCap(pool: GeckoTerminalPool): number {
    // Approximate MC from price * supply (use liquidity as proxy if needed)
    // For a token pair, we approximate using the token0 price
    return pool.liquidity * 2; // rough approximation
  }

  private async storePool(pool: GeckoTerminalPool): Promise<void> {
    try {
      await this.prisma.geckoTerminalPool.upsert({
        where: { poolAddress: pool.poolAddress },
        update: {
          volume24h: pool.volume24h,
          liquidity: pool.liquidity,
          price: pool.price,
          isNew: pool.isNew,
        },
        create: {
          poolAddress: pool.poolAddress,
          network: pool.network,
          token0Symbol: pool.token0Symbol,
          token1Symbol: pool.token1Symbol,
          token0Address: pool.token0Address,
          token1Address: pool.token1Address,
          volume24h: pool.volume24h,
          liquidity: pool.liquidity,
          price: pool.price,
          isNew: pool.isNew,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to store GeckoTerminal pool: ${err.message}`);
    }
  }
}
