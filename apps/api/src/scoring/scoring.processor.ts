import { Processor, WorkerHost, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScoringService } from './scoring.service';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

export interface RecalculateCatalystJob {
  catalystId: string;
}

export interface RecalculateWalletJob {
  walletId: string;
}

export interface RecalculatePositionRiskJob {
  positionId: string;
}

@Processor('scoring')
export class ScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(ScoringProcessor.name);

  constructor(
    private readonly scoringService: ScoringService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  // Job: recalculate-catalyst-rank
  @Process('recalculate-catalyst-rank')
  async handleRecalculateCatalystRank(job: Job<RecalculateCatalystJob>) {
    this.logger.log(`Processing recalculate-catalyst-rank job for catalyst: ${job.data.catalystId}`);

    const catalyst = await this.prisma.catalyst.findUnique({
      where: { id: job.data.catalystId },
    });

    if (!catalyst) {
      this.logger.warn(`Catalyst not found: ${job.data.catalystId}`);
      return { catalystId: job.data.catalystId, newRankScore: 0, error: 'Catalyst not found' };
    }

    // Calculate days until effective
    let daysUntilEffective: number | undefined;
    if (catalyst.effectiveAt) {
      const now = new Date();
      const effective = new Date(catalyst.effectiveAt);
      daysUntilEffective = Math.ceil((effective.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const newRankScore = this.scoringService.calculateCatalystRank({
      impactScore: catalyst.impactScore,
      confidenceScore: catalyst.confidenceScore,
      urgencyScore: catalyst.urgencyScore,
      daysUntilEffective,
    });

    await this.prisma.catalyst.update({
      where: { id: job.data.catalystId },
      data: { rankScore: newRankScore },
    });

    this.logger.log(`Updated catalyst ${job.data.catalystId} rankScore to ${newRankScore}`);
    return { catalystId: job.data.catalystId, newRankScore };
  }

  // Job: recalculate-wallet-score
  @Process('recalculate-wallet-score')
  async handleRecalculateWalletScore(job: Job<RecalculateWalletJob>) {
    this.logger.log(`Processing recalculate-wallet-score job for wallet: ${job.data.walletId}`);

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: job.data.walletId },
      include: { events: { orderBy: { blockTimestamp: 'desc' } } },
    });

    if (!wallet) {
      this.logger.warn(`Wallet not found: ${job.data.walletId}`);
      return { walletId: job.data.walletId, error: 'Wallet not found' };
    }

    // Compute wallet metrics from events
    const events = wallet.events;
    let totalPnl = 0;
    let winCount = 0;
    let totalTrades = 0;
    const specializationSet = new Set<string>();

    if (events.length > 0) {
      // Calculate P&L from usdValue changes
      const firstEvent = events[events.length - 1];
      const lastEvent = events[0];
      totalPnl = (lastEvent.usdValue ?? 0) - (firstEvent.usdValue ?? 0);

      // Estimate win rate based on event types
      const profitableEvents = events.filter(e => 
        e.eventType === 'sell' || e.eventType === 'close' || e.eventType === 'take_profit'
      );
      winCount = profitableEvents.length;
      totalTrades = events.length;

      // Extract specializations from event summaries or types
      events.forEach(e => {
        if (e.summary) {
          const defiMatch = e.summary.match(/defi|swap|liquidity|decentralized/i);
          const layer2Match = e.summary.match(/layer[_-]?2|l2|arbitrum|optimism|polygon/i);
          const nftMatch = e.summary.match(/nft|collection|mint/i);
          const yieldMatch = e.summary.match(/yield|farm|stake/i);
          
          if (defiMatch) specializationSet.add('defi');
          if (layer2Match) specializationSet.add('layer2');
          if (nftMatch) specializationSet.add('nft');
          if (yieldMatch) specializationSet.add('yield');
        }
        if (e.eventType) {
          if (e.eventType.includes('defi') || e.eventType.includes('swap')) specializationSet.add('defi');
          if (e.eventType.includes('layer2') || e.eventType.includes('l2')) specializationSet.add('layer2');
        }
      });
    }

    const winRate = totalTrades > 0 ? winCount / totalTrades : 0.5;

    // Calculate average holding period
    let avgHoldingPeriodDays = 7;
    if (events.length >= 2) {
      const timestamps = events
        .filter(e => e.blockTimestamp)
        .map(e => new Date(e.blockTimestamp!).getTime())
        .sort((a, b) => a - b);
      
      if (timestamps.length >= 2) {
        const totalHoldingMs = timestamps[timestamps.length - 1] - timestamps[0];
        avgHoldingPeriodDays = totalHoldingMs / (1000 * 60 * 60 * 24);
      }
    }

    const scoreResult = this.scoringService.calculateWalletScore({
      totalPnl,
      winRate,
      avgHoldingPeriodDays,
      specialization: Array.from(specializationSet),
    });

    // Save WalletScore record
    await this.prisma.walletScore.create({
      data: {
        walletId: wallet.id,
        winRateScore: scoreResult.breakdown.winRateScore,
        timingScore: scoreResult.breakdown.holdingScore,
        convictionScore: 0, // Not computed in current model
        specializationScore: scoreResult.breakdown.specialScore,
        signalQualityScore: scoreResult.breakdown.pnlScore,
        totalScore: scoreResult.totalScore,
        methodVersion: 'v2',
      },
    });

    this.logger.log(`Updated wallet ${job.data.walletId} score to ${scoreResult.totalScore}`);
    return { walletId: job.data.walletId, totalScore: scoreResult.totalScore };
  }

  // Job: recalculate-position-risk
  @Process('recalculate-position-risk')
  async handleRecalculatePositionRisk(job: Job<RecalculatePositionRiskJob>) {
    this.logger.log(`Processing recalculate-position-risk job for position: ${job.data.positionId}`);

    const position = await this.prisma.position.findUnique({
      where: { id: job.data.positionId },
      include: { asset: true },
    });

    if (!position) {
      this.logger.warn(`Position not found: ${job.data.positionId}`);
      return { positionId: job.data.positionId, error: 'Position not found' };
    }

    // Calculate days since review
    const daysSinceReview = position.lastReviewedAt
      ? Math.ceil((Date.now() - new Date(position.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Check if near catalyst window
    const now = new Date();
    const nearCatalystWindow = 
      (position.catalystWindowStart && new Date(position.catalystWindowStart) <= now) &&
      (position.catalystWindowEnd && new Date(position.catalystWindowEnd) >= now);

    // Estimate concentration (would need portfolio context - using maxSizePct as proxy)
    const concentrationPct = position.maxSizePct ?? 10;

    // Map conviction string
    const conviction = (position.currentConviction as 'low' | 'medium' | 'high') || 'medium';

    // Estimate correlation (placeholder - would need portfolio-level analysis)
    const correlationWithOtherPositions = 0.3;

    const riskResult = this.scoringService.calculatePositionRisk({
      concentrationPct,
      daysSinceReview,
      conviction,
      nearCatalystWindow,
      correlationWithOtherPositions,
    });

    // Save PositionRiskSnapshot
    await this.prisma.positionRiskSnapshot.create({
      data: {
        positionId: position.id,
        concentrationScore: riskResult.breakdown.concentrationRisk,
        correlationScore: riskResult.breakdown.correlationRisk,
        invalidationRiskScore: riskResult.breakdown.convictionRisk,
        eventRiskScore: riskResult.breakdown.catalystRisk,
        totalRiskScore: riskResult.totalRiskScore,
        summary: `Risk assessment: ${riskResult.totalRiskScore}/100`,
      },
    });

    this.logger.log(`Updated position ${job.data.positionId} risk to ${riskResult.totalRiskScore}`);
    return { positionId: job.data.positionId, totalRiskScore: riskResult.totalRiskScore };
  }
}
