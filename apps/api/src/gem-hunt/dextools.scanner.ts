import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface DEXToolsAnnouncement {
  id: string;
  chain: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  txHash: string | null;
  priceUSD: number | null;
  estimatedMC: number | null;
  detectedAt: Date;
}

export interface DEXToolsPool {
  chain: string;
  address: string;
  token0Symbol: string;
  token1Symbol: string;
  price: number;
  liquidity: number;
  volume24h: number;
  txHash: string;
}

@Injectable()
export class DEXToolsScanner {
  private readonly logger = new Logger(DEXToolsScanner.name);
  private readonly baseUrl = 'https://api.dextools.io/v2';

  // Supported chain IDs
  readonly SUPPORTED_CHAINS = ['solana', 'ethereum', 'base', 'bsc', 'avalanche'];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get newly announced tokens (real-time pipeline).
   * GET /v2/announcements
   * Returns freshly announced tokens with estimated MC.
   */
  async getNewAnnouncedTokens(chain: string, limit: number = 20): Promise<DEXToolsAnnouncement[]> {
    if (!this.SUPPORTED_CHAINS.includes(chain)) {
      this.logger.warn(`Unsupported chain for DEXTools: ${chain}`);
      return [];
    }

    try {
      const { data } = await axios.get(`${this.baseUrl}/announcements`, {
        params: { chain, limit },
        timeout: 15_000,
        headers: { 'Accept': 'application/json' },
      });

      const announcements: DEXToolsAnnouncement[] = (data?.data ?? []).map((item: any) => ({
        id: item.id ?? item.txHash ?? Math.random().toString(36),
        chain,
        tokenAddress: item.tokenAddress ?? item.baseToken ?? '',
        tokenSymbol: item.symbol ?? null,
        tokenName: item.name ?? null,
        txHash: item.txHash ?? null,
        priceUSD: item.priceUSD ? parseFloat(item.priceUSD) : null,
        estimatedMC: item.estimatedMC ? parseFloat(item.estimatedMC) : null,
        detectedAt: new Date(),
      }));

      // Store in DB
      for (const ann of announcements) {
        await this.storeAnnouncement(ann);
      }

      this.logger.log(`DEXTools: fetched ${announcements.length} new announcements for ${chain}`);
      return announcements;
    } catch (err: any) {
      this.logger.warn(`DEXTools announcements failed for ${chain}: ${err.message}`);
      return [];
    }
  }

  /**
   * Get detailed pool info.
   * GET /v2/pool/{chain}/{address}
   */
  async getPoolData(chain: string, address: string): Promise<DEXToolsPool | null> {
    if (!this.SUPPORTED_CHAINS.includes(chain)) return null;

    try {
      const { data } = await axios.get(`${this.baseUrl}/pool/${chain}/${address}`, {
        timeout: 15_000,
        headers: { 'Accept': 'application/json' },
      });

      const attrs = data?.data?.attributes ?? data;

      return {
        chain,
        address,
        token0Symbol: attrs.baseToken?.symbol ?? '',
        token1Symbol: attrs.quoteToken?.symbol ?? '',
        price: parseFloat(attrs.price ?? '0'),
        liquidity: parseFloat(attrs.liquidity ?? '0'),
        volume24h: parseFloat(attrs.volume24h ?? attrs.volume_h24 ?? '0'),
        txHash: attrs.txHash ?? '',
      };
    } catch (err: any) {
      this.logger.warn(`DEXTools pool data failed for ${chain}/${address}: ${err.message}`);
      return null;
    }
  }

  /**
   * Scan for newest pools on a chain.
   * GET /v2/pool/search?chain=solana&sort=created_at&direction=desc
   */
  async scanForNewPools(chain: string): Promise<DEXToolsPool[]> {
    if (!this.SUPPORTED_CHAINS.includes(chain)) return [];

    try {
      const { data } = await axios.get(`${this.baseUrl}/pool/search`, {
        params: { chain, sort: 'created_at', direction: 'desc', limit: 50 },
        timeout: 15_000,
        headers: { 'Accept': 'application/json' },
      });

      const pools: DEXToolsPool[] = (data?.data ?? []).map((item: any) => {
        const attrs = item.attributes ?? item;
        return {
          chain,
          address: item.id ?? attrs.address ?? '',
          token0Symbol: attrs.baseToken?.symbol ?? '',
          token1Symbol: attrs.quoteToken?.symbol ?? '',
          price: parseFloat(attrs.price ?? '0'),
          liquidity: parseFloat(attrs.liquidity ?? '0'),
          volume24h: parseFloat(attrs.volume24h ?? '0'),
          txHash: attrs.txHash ?? '',
        };
      });

      // Filter: liquidity > $10K, volume > $5K
      const filtered = pools.filter(
        (p) => p.liquidity >= 10_000 && p.volume24h >= 5_000,
      );

      this.logger.log(`DEXTools: scanned ${filtered.length} new pools on ${chain}`);
      return filtered;
    } catch (err: any) {
      this.logger.warn(`DEXTools new pool scan failed for ${chain}: ${err.message}`);
      return [];
    }
  }

  private async storeAnnouncement(ann: DEXToolsAnnouncement): Promise<void> {
    try {
      await this.prisma.dEXToolsAnnouncement.upsert({
        where: {
          chain_tokenAddress: {
            chain: ann.chain,
            tokenAddress: ann.tokenAddress,
          },
        },
        update: {
          tokenSymbol: ann.tokenSymbol,
          tokenName: ann.tokenName,
          txHash: ann.txHash,
          priceUSD: ann.priceUSD,
          estimatedMC: ann.estimatedMC,
        },
        create: {
          chain: ann.chain,
          tokenAddress: ann.tokenAddress,
          tokenSymbol: ann.tokenSymbol,
          tokenName: ann.tokenName,
          txHash: ann.txHash,
          priceUSD: ann.priceUSD,
          estimatedMC: ann.estimatedMC,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to store DEXTools announcement: ${err.message}`);
    }
  }
}
