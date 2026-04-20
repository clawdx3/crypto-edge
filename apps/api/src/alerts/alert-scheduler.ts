import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { ScoringService } from '../scoring/scoring.service';

@Injectable()
export class AlertScheduler {
  private readonly logger = new Logger(AlertScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly scoringService: ScoringService,
  ) {}

  /** Daily market brief — 08:00 UTC */
  @Cron('0 8 * * *')
  async sendDailyBrief() {
    this.logger.log('Sending daily brief...');
    try {
      const [
        regime,
        catalysts,
        positions,
        recentAlerts,
      ] = await Promise.all([
        this.prisma.marketRegimeSnapshot.findFirst({ orderBy: { capturedAt: 'desc' } }),
        this.prisma.catalyst.findMany({
          where: { status: 'upcoming', effectiveAt: { gte: new Date() } },
          orderBy: { rankScore: 'desc' },
          take: 5,
          include: { asset: true },
        }),
        this.prisma.position.findMany({ where: { status: 'open' } }),
        this.prisma.alert.findMany({ where: { status: 'sent' }, orderBy: { sentAt: 'desc' }, take: 5 }),
      ]);

      const lines = [
        '📊 *Daily Brief — ${new Date().toISOString().split("T")[0]}*',
        '',
        regime ? `*Regime:* ${regime.label.toUpperCase()} (score: ${regime.totalScore})` : '*Regime:* No data',
        '',
        '*🔔 Top Catalysts:*',
        ...catalysts.map((c, i) => 
          `${i + 1}. ${c.title} — ${c.asset?.symbol ?? 'N/A'} — ${c.effectiveAt?.toISOString().split('T')[0] ?? 'TBD'} (rank: ${c.rankScore})`
        ),
        '',
        '*💼 Open Positions:*',
        ...positions.map((p) => 
          `- ${p.asset?.symbol ?? 'N/A'}: ${p.currentConviction ?? 'unknown'} conviction | Review: ${p.nextReviewAt?.toISOString().split('T')[0] ?? 'none'}`
        ),
        '',
        '*🔔 Recent Alerts:*',
        ...recentAlerts.map((a) => `[${a.severity.toUpperCase()}] ${a.title}`),
      ];

      await this.telegramService.sendMessage(lines.join('\n'));
      
      // Record alert
      await this.prisma.alert.create({
        data: {
          type: 'daily_brief',
          severity: 'info',
          title: 'Daily brief sent',
          status: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log('Daily brief sent');
    } catch (err) {
      this.logger.error('Failed to send daily brief: ' + err.message);
    }
  }

  /** EOD summary — 20:00 UTC */
  @Cron('0 20 * * *')
  async sendEodSummary() {
    this.logger.log('Sending EOD summary...');
    try {
      const [
        regime,
        catalystsEffectiveToday,
        positionsNeedingReview,
      ] = await Promise.all([
        this.prisma.marketRegimeSnapshot.findFirst({ orderBy: { capturedAt: 'desc' } }),
        this.prisma.catalyst.findMany({
          where: {
            status: 'upcoming',
            effectiveAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
        this.prisma.position.findMany({
          where: {
            status: 'open',
            OR: [
              { nextReviewAt: { lte: new Date() } },
              { nextReviewAt: null },
            ],
          },
        }),
      ]);

      const lines = [
        '🌙 *EOD Summary — ${new Date().toISOString().split("T")[0]}*',
        '',
        regime ? `*Regime:* ${regime.label.toUpperCase()} | BTC trend: ${regime.btcTrendScore > 0 ? '📈' : '📉'} ETH trend: ${regime.ethTrendScore > 0 ? '📈' : '📉'}` : '',
        '',
        '*⚡ Today\'s Catalysts:*',
        catalystsEffectiveToday.length === 0
          ? 'None'
          : catalystsEffectiveToday.map((c) => `- ${c.title} (${c.asset?.symbol})`).join('\n'),
        '',
        '*⚠️ Positions Need Review:*',
        positionsNeedingReview.length === 0
          ? 'None — all positions reviewed'
          : positionsNeedingReview.map((p) => `- ${p.asset?.symbol ?? 'N/A'}: ${p.currentConviction ?? 'unknown'}`).join('\n'),
      ];

      await this.telegramService.sendMessage(lines.join('\n'));
      this.logger.log('EOD summary sent');
    } catch (err) {
      this.logger.error('Failed to send EOD summary: ' + err.message);
    }
  }
}