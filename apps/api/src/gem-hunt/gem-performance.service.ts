import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface DexScreenerPairMinimal {
  priceUsd?: string;
  marketCap?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
}

@Injectable()
export class GemPerformanceService {
  private readonly logger = new Logger(GemPerformanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Every 30 minutes: snapshot tracked BUY gems and compute ROI */
  @Cron('*/30 * * * *')
  async snapshotTrackedGems(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const reports = await this.prisma.tokenResearchReport.findMany({
      where: {
        thesis: 'BUY',
        detectedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { thesisStrength: 'desc' },
    });

    if (reports.length === 0) {
      this.logger.debug('No recent BUY gems to snapshot');
      return;
    }

    this.logger.log(`📊 Snapshotting ${reports.length} tracked BUY gems...`);

    let positiveCount = 0;
    let totalRoi = 0;

    for (const report of reports) {
      try {
        const current = await this.fetchDexScreenerData(report.tokenAddress, report.chain);
        const detectedPrice = parseFloat(report.detectedPrice ?? report.price ?? '0');
        const currentPrice = current.priceUsd ?? 0;

        let roiPct: number | undefined;
        if (detectedPrice > 0 && currentPrice > 0) {
          roiPct = ((currentPrice - detectedPrice) / detectedPrice) * 100;
          if (roiPct > 0) positiveCount++;
          totalRoi += roiPct;
        }

        await this.prisma.gemPerformanceSnapshot.create({
          data: {
            gemId: report.tokenAddress,
            tokenAddress: report.tokenAddress,
            chain: report.chain,
            snapshotAt: new Date(),
            priceUsd: current.priceUsd ?? null,
            marketCapUsd: current.marketCapUsd ?? null,
            liquidityUsd: current.liquidityUsd ?? null,
            volume24h: current.volume24h ?? null,
            roiPct: roiPct ?? null,
            notes: roiPct !== undefined ? `ROI vs detectedPrice ${detectedPrice}` : null,
          },
        });
      } catch (err: unknown) {
        this.logger.warn(`Failed to snapshot ${report.tokenAddress}: ${(err as Error).message}`);
      }
    }

    const avgRoi = reports.length > 0 ? totalRoi / reports.length : 0;
    this.logger.log(
      `✅ Snapshot complete: ${reports.length} gems tracked, ${positiveCount} positive ROI, avg ROI ${avgRoi.toFixed(2)}%`,
    );
  }

  private async fetchDexScreenerData(
    tokenAddress: string,
    chain: string,
  ): Promise<{ priceUsd: number | undefined; marketCapUsd: number | undefined; liquidityUsd: number | undefined; volume24h: number | undefined }> {
    try {
      const response = await axios.get<unknown>(
        `https://api.dexscreener.com/tokens/v1/${chain}/${tokenAddress}`,
        { timeout: 10_000 },
      );
      const payload = response.data;
      const pairs: DexScreenerPairMinimal[] = Array.isArray(payload) ? payload : ((payload as Record<string, unknown>)['pairs'] as DexScreenerPairMinimal[] | undefined) ?? [];
      if (pairs.length === 0) {
        return { priceUsd: undefined, marketCapUsd: undefined, liquidityUsd: undefined, volume24h: undefined };
      }
      const best = pairs[0]!;
      return {
        priceUsd: best.priceUsd ? parseFloat(best.priceUsd) : undefined,
        marketCapUsd: best.marketCap ? parseFloat(best.marketCap) : undefined,
        liquidityUsd: best.liquidity?.usd ?? undefined,
        volume24h: best.volume?.h24 ?? undefined,
      };
    } catch (err: unknown) {
      this.logger.warn(`DexScreener fetch failed for ${chain}/${tokenAddress}: ${(err as Error).message}`);
      return { priceUsd: undefined, marketCapUsd: undefined, liquidityUsd: undefined, volume24h: undefined };
    }
  }

  /** Summarize current gem ROI (used by REST endpoint) */
  async getPerformanceSummary() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const reports = await this.prisma.tokenResearchReport.findMany({
      where: {
        thesis: 'BUY',
        detectedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { thesisStrength: 'desc' },
      take: 200,
    });

    const gems = await Promise.all(
      reports.map(async (report) => {
        const latestSnapshot = await this.prisma.gemPerformanceSnapshot.findFirst({
          where: { tokenAddress: report.tokenAddress },
          orderBy: { snapshotAt: 'desc' },
        });

        const detectedPrice = parseFloat(report.detectedPrice ?? report.price ?? '0');
        const latestPrice = latestSnapshot?.priceUsd ?? undefined;

        let roiPct: number | undefined;
        if (detectedPrice > 0 && latestPrice !== undefined && latestPrice > 0) {
          roiPct = ((latestPrice - detectedPrice) / detectedPrice) * 100;
        }

        const snapshotCount = await this.prisma.gemPerformanceSnapshot.count({
          where: { tokenAddress: report.tokenAddress },
        });

        return {
          tokenAddress: report.tokenAddress,
          chain: report.chain,
          tokenName: report.tokenName,
          detectedAt: report.detectedAt,
          detectedPrice: report.detectedPrice,
          detectedMarketCap: report.detectedMarketCap,
          latestPrice,
          latestMarketCap: latestSnapshot?.marketCapUsd ?? undefined,
          roiPct,
          snapshotCount,
        };
      }),
    );

    const validRois = gems.filter((g) => g.roiPct !== undefined).map((g) => g.roiPct!);
    const positiveRoiCount = validRois.filter((r) => r > 0).length;
    const avgRoiPct = validRois.length > 0 ? validRois.reduce((a, b) => a + b, 0) / validRois.length : 0;

    return {
      generatedAt: new Date(),
      totalTracked: gems.length,
      positiveRoiCount,
      avgRoiPct,
      gems,
    };
  }
}
