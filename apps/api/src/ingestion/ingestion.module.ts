import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { IngestionScheduler } from './ingestion.scheduler';
import { MarketSourceAdapter } from './adapters/market-source.adapter';
import { WalletSourceAdapter } from './adapters/wallet-source.adapter';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [IngestionController],
  providers: [IngestionService, IngestionScheduler, MarketSourceAdapter, WalletSourceAdapter],
})
export class IngestionModule {}
