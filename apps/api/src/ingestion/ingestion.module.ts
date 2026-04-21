import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { IngestionScheduler } from './ingestion.scheduler';
import { MarketSourceAdapter } from './adapters/market-source.adapter';
import { WalletSourceAdapter } from './adapters/wallet-source.adapter';
import { CatalystSourceAdapter } from './adapters/catalyst-source.adapter';
import { DatabaseModule } from '../database/database.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [DatabaseModule, ScoringModule],
  controllers: [IngestionController],
  providers: [IngestionService, IngestionScheduler, MarketSourceAdapter, WalletSourceAdapter, CatalystSourceAdapter],
})
export class IngestionModule {}
