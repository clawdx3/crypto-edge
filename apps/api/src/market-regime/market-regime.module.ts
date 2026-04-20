import { Module } from '@nestjs/common';
import { MarketRegimeController } from './market-regime.controller';
import { MarketRegimeService } from './market-regime.service';

@Module({
  controllers: [MarketRegimeController],
  providers: [MarketRegimeService],
})
export class MarketRegimeModule {}
