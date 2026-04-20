import { Injectable, Logger } from '@nestjs/common';
import { MarketSourceAdapter } from './adapters/market-source.adapter';
import { WalletSourceAdapter } from './adapters/wallet-source.adapter';
import { CatalystSourceAdapter } from './adapters/catalyst-source.adapter';
import { PrismaService } from '../prisma/prisma.service';

export interface IngestionStatus {
  adapters: string[];
  message: string;
  lastSyncAt?: string;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly marketSourceAdapter: MarketSourceAdapter,
    private readonly walletSourceAdapter: WalletSourceAdapter,
    private readonly catalystSourceAdapter: CatalystSourceAdapter,
    private readonly prisma: PrismaService,
  ) {}

  getStatus(): IngestionStatus {
    return {
      adapters: ['market', 'catalysts', 'wallets'],
      message: 'Background jobs and external provider integrations are active.',
    };
  }

  async syncMarketMetrics(): Promise<{ message: string }> {
    this.logger.log('Fetching market metrics from providers...');

    try {
      const metrics = await this.marketSourceAdapter.fetchMarketMetrics();

      // Build regime snapshot from raw metrics
      const snapshot = await this.buildRegimeSnapshot(metrics);

      // Persist to DB
      await this.prisma.marketRegimeSnapshot.create({ data: snapshot });

      this.logger.log(
        `Market regime snapshot saved: label=${snapshot.label}, score=${snapshot.totalScore.toFixed(3)}`,
      );

      return { message: `Market metrics synced. Regime: ${snapshot.label}` };
    } catch (error) {
      this.logger.error('Failed to sync market metrics', error);
      return { message: 'Market metrics sync failed' };
    }
  }

  private async buildRegimeSnapshot(metrics: {
    btcTrend7d: number;
    ethTrend7d: number;
    stablecoinFlow: number;
    tvlChange24h: number;
    ethFunding: number;
    openInterestBtc: number;
    openInterestEth: number;
  }): Promise<{
    capturedAt: Date;
    btcTrendScore: number;
    ethTrendScore: number;
    stablecoinFlowScore: number;
    tvlScore: number;
    fundingScore: number;
    openInterestScore: number;
    volatilityScore: number;
    totalScore: number;
    label: string;
  }> {
    // Score components (all normalized -1 to 1)
    const btcTrendScore = metrics.btcTrend7d;
    const ethTrendScore = metrics.ethTrend7d;
    const stablecoinFlowScore = metrics.stablecoinFlow;
    const tvlScore = Math.max(-1, Math.min(1, metrics.tvlChange24h / 5)); // 5% change = max
    const fundingScore = metrics.ethFunding;

    // Open interest: compare to baseline of 0 (requires premium data, use 0 for now)
    const openInterestScore = 0;

    // Volatility: derived from BTC trend divergence
    const volatilityScore = Math.abs(metrics.btcTrend7d - metrics.ethTrend7d);

    // Weighted total score
    const totalScore =
      btcTrendScore * 0.25 +
      ethTrendScore * 0.15 +
      stablecoinFlowScore * 0.20 +
      tvlScore * 0.15 +
      fundingScore * 0.10 +
      openInterestScore * 0.05 +
      volatilityScore * 0.10;

    // Label based on score thresholds
    let label: string;
    if (totalScore >= 0.4) {
      label = 'BULL';
    } else if (totalScore <= -0.4) {
      label = 'BEAR';
    } else if (Math.abs(volatilityScore) > 0.5) {
      label = 'VOLATILE';
    } else {
      label = 'NEUTRAL';
    }

    return {
      capturedAt: new Date(),
      btcTrendScore,
      ethTrendScore,
      stablecoinFlowScore,
      tvlScore,
      fundingScore,
      openInterestScore,
      volatilityScore,
      totalScore,
      label,
    };
  }

  async syncCatalysts(): Promise<{ message: string }> {
    this.logger.log('Syncing catalyst events from providers...');
    try {
      const result = await this.catalystSourceAdapter.syncCatalysts();
      return { message: `Catalysts sync complete: ${result.added} added, ${result.updated} updated` };
    } catch (error) {
      this.logger.error('Failed to sync catalysts', error);
      return { message: 'Catalysts sync failed' };
    }
  }

  async syncWalletTransactions(walletId: string): Promise<{ message: string }> {
    this.logger.log(`syncWalletTransactions called for wallet: ${walletId}`);
    try {
      const result = await this.walletSourceAdapter.syncAllWallets();
      return { message: `Wallet sync complete: ${result.synced} wallets, ${result.newEvents} new events` };
    } catch (error) {
      this.logger.error('Failed to sync wallet transactions', error);
      return { message: 'Wallet transactions sync failed' };
    }
  }
}
