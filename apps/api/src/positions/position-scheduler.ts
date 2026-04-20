import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class PositionScheduler {
  private readonly logger = new Logger(PositionScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  /** Run position risk snapshots every 6 hours */
  @Cron('0 */6 * * *')
  async recalculatePositionRisks() {
    this.logger.log('Running position risk snapshots...');
    try {
      const positions = await this.prisma.position.findMany({ where: { status: 'open' } });

      for (const position of positions) {
        const riskScore = this.scoringService.calculatePositionRisk({
          concentrationPct: position.maxSizePct ?? 10,
          daysSinceReview: position.lastReviewedAt
            ? Math.ceil((Date.now() - position.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 999,
          conviction: (position.currentConviction as 'low' | 'medium' | 'high') ?? 'medium',
          nearCatalystWindow: false, // could enhance with catalyst lookup
          correlationWithOtherPositions: 0.3,
        });

        await this.prisma.positionRiskSnapshot.create({
          data: {
            positionId: position.id,
            concentrationScore: riskScore.breakdown.concentrationRisk,
            correlationScore: riskScore.breakdown.correlationRisk,
            invalidationRiskScore: riskScore.breakdown.convictionRisk,
            eventRiskScore: riskScore.breakdown.catalystRisk,
            totalRiskScore: riskScore.totalRiskScore,
            summary: JSON.stringify(riskScore.breakdown),
          },
        });
      }

      this.logger.log(`Position risk snapshots created for ${positions.length} positions`);
    } catch (err) {
      this.logger.error('Failed to run position risk snapshots: ' + err.message);
    }
  }
}