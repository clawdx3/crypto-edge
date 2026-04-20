import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { IngestionService } from './ingestion.service';

@Injectable()
export class IngestionScheduler {
  private readonly logger = new Logger(IngestionScheduler.name);

  constructor(private readonly ingestionService: IngestionService) {}

  @Interval(15 * 60 * 1000) // every 15 minutes
  async handleSyncMarketMetrics(): Promise<void> {
    this.logger.debug('Scheduled market metrics sync triggered');
    await this.ingestionService.syncMarketMetrics();
  }

  @Interval(15 * 60 * 1000) // every 15 minutes
  async handleSyncWalletTransactions(): Promise<void> {
    this.logger.debug('Scheduled wallet transactions sync triggered');
    await this.ingestionService.syncWalletTransactions('all');
  }

  @Interval(60 * 60 * 1000) // every 1 hour
  async handleSyncCatalysts(): Promise<void> {
    this.logger.debug('Scheduled catalyst sync triggered');
    await this.ingestionService.syncCatalysts();
  }
}
