import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringService } from '../../scoring/scoring.service';
import axios from 'axios';

export interface RawCatalyst {
  title: string;
  description: string | null;
  type: 'unlock' | 'listing' | 'governance_vote' | 'treasury_move' | 'staking_change' | 'protocol_launch' | 'incentive_program' | 'fundraising';
  assetSymbol?: string;
  assetContract?: string;
  sourceUrl: string;
  sourceName: string;
  effectiveAt: Date;
  impactScore: number;
  confidenceScore: number;
}

@Injectable()
export class CatalystSourceAdapter {
  private readonly logger = new Logger(CatalystSourceAdapter.name);
  private readonly coinGeckoBase = 'https://api.coingecko.com/api/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  /**
   * Sync catalysts from all sources.
   * Runs every hour via cron.
   */
  async syncCatalysts(): Promise<{ added: number; updated: number }> {
    const results = await Promise.allSettled([
      this.fetchFromCoinGecko(),
      this.fetchFromTokenUnlocks(),
      this.fetchManualList(),
    ]);

    let added = 0;
    let updated = 0;

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      for (const catalyst of result.value) {
        const existing = await this.prisma.catalyst.findFirst({
          where: { title: catalyst.title, sourceName: catalyst.sourceName },
        });

        if (existing) {
          // Update scores
          const newRank = this.scoringService.calculateCatalystRank({
            impactScore: catalyst.impactScore,
            confidenceScore: catalyst.confidenceScore,
            urgencyScore: catalyst.impactScore,
            daysUntilEffective: this.daysUntil(catalyst.effectiveAt),
          });
          await this.prisma.catalyst.update({
            where: { id: existing.id },
            data: {
              impactScore: catalyst.impactScore,
              confidenceScore: catalyst.confidenceScore,
              rankScore: newRank,
              effectiveAt: catalyst.effectiveAt,
            },
          });
          updated++;
        } else {
          await this.createCatalyst(catalyst);
          added++;
        }
      }
    }

    this.logger.log(`Catalyst sync complete: ${added} added, ${updated} updated`);
    return { added, updated };
  }

  private async fetchFromCoinGecko(): Promise<RawCatalyst[]> {
    const apiKey = this.configService.get<string>('COINGECKO_API_KEY');
    const catalysts: RawCatalyst[] = [];

    // Get top assets we're tracking
    const assets = await this.prisma.asset.findMany({
      where: { isActive: true },
      take: 20,
    });

    for (const asset of assets) {
      try {
        const params = apiKey ? { x_cg_demo_api_key: apiKey } : {};
        const { data } = await axios.get(
          `${this.coinGeckoBase}/coins/${asset.symbol.toLowerCase()}/events`,
          { params },
        );

        if (!data?.data?.events) continue;

        for (const event of data.data.events.slice(0, 10)) {
          const type = this.mapEventType(event.type);
          if (!type) continue;

          catalysts.push({
            title: event.title ?? event.description ?? 'Unknown event',
            description: event.description ?? null,
            type,
            assetSymbol: asset.symbol,
            assetContract: asset.contractAddress ?? undefined,
            sourceUrl: event.url ?? 'https://www.coingecko.com',
            sourceName: 'CoinGecko',
            effectiveAt: new Date(event.date_event ?? event.start_date),
            impactScore: this.estimateImpact(type, event.date_event),
            confidenceScore: 70,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch CoinGecko events for ${asset.symbol}: ${err.message}`);
      }
    }

    return catalysts;
  }

  private async fetchFromTokenUnlocks(): Promise<RawCatalyst[]> {
    const catalysts: RawCatalyst[] = [];

    try {
      // TokenUnlocks has a free API
      const { data } = await axios.get('https://api.tokenunlocks.com/upcoming');
      const items = data.upcoming ?? [];

      for (const item of items.slice(0, 30)) {
        catalysts.push({
          title: `${item.token_symbol ?? 'Token'} Unlock`,
          description: item.description ?? null,
          type: 'unlock',
          assetSymbol: item.token_symbol,
          assetContract: item.contract_address,
          sourceUrl: `https://tokenunlocks.com/unlock/${item.slug}`,
          sourceName: 'TokenUnlocks',
          effectiveAt: new Date(item.unlock_date ?? Date.now() + 30 * 24 * 60 * 60 * 1000),
          impactScore: this.estimateUnlockImpact(item),
          confidenceScore: 80,
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch TokenUnlocks: ${err.message}`);
    }

    return catalysts;
  }

  private async fetchManualList(): Promise<RawCatalyst[]> {
    // Placeholder: reads from a manual CSV or hardcoded list
    // In v1 this is a no-op — manual catalysts are added via API
    return [];
  }

  private mapEventType(eventType: string): RawCatalyst['type'] | null {
    const map: Record<string, RawCatalyst['type']> = {
      'Staking Rewards': 'staking_change',
      'NFT': 'protocol_launch',
      'Exchange Listing': 'listing',
      'Token Sale': 'fundraising',
      'Governance': 'governance_vote',
      'Award': 'incentive_program',
      'Release': 'unlock',
    };
    return map[eventType] ?? null;
  }

  private estimateImpact(type: RawCatalyst['type'], eventDate: string): number {
    const base: Record<RawCatalyst['type'], number> = {
      unlock: 75,
      listing: 65,
      governance_vote: 50,
      treasury_move: 55,
      staking_change: 45,
      protocol_launch: 60,
      incentive_program: 40,
      fundraising: 55,
    };
    const baseScore = base[type] ?? 50;
    // Boost if event is within 7 days
    const daysUntil = this.daysUntil(new Date(eventDate));
    if (daysUntil <= 7 && daysUntil >= 0) return Math.min(100, baseScore + 15);
    return baseScore;
  }

  private estimateUnlockImpact(item: any): number {
    // Larger unlock % of circulating supply = higher impact
    const unlockPct = parseFloat(item.unlock_percentage ?? '0');
    const value = parseFloat(item.total_value ?? '0');
    if (unlockPct > 10 || value > 100_000_000) return 85;
    if (unlockPct > 5 || value > 50_000_000) return 70;
    return 55;
  }

  private daysUntil(date: Date): number {
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  private async createCatalyst(catalyst: RawCatalyst): Promise<void> {
    // Find asset
    let assetId: string | null = null;
    if (catalyst.assetSymbol) {
      const asset = await this.prisma.asset.findFirst({
        where: { symbol: catalyst.assetSymbol.toUpperCase() },
      });
      assetId = asset?.id ?? null;
    }

    const daysUntil = this.daysUntil(catalyst.effectiveAt);
    const rankScore = this.scoringService.calculateCatalystRank({
      impactScore: catalyst.impactScore,
      confidenceScore: catalyst.confidenceScore,
      urgencyScore: catalyst.impactScore,
      daysUntilEffective: daysUntil,
    });

    await this.prisma.catalyst.create({
      data: {
        assetId,
        type: catalyst.type,
        title: catalyst.title,
        description: catalyst.description,
        sourceUrl: catalyst.sourceUrl,
        sourceName: catalyst.sourceName,
        detectedAt: new Date(),
        effectiveAt: catalyst.effectiveAt,
        status: daysUntil < 0 ? 'expired' : 'upcoming',
        impactScore: catalyst.impactScore,
        confidenceScore: catalyst.confidenceScore,
        urgencyScore: catalyst.impactScore,
        rankScore,
        isManual: false,
      },
    });
  }
}
