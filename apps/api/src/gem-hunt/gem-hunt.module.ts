import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { GemHuntService } from './gem-hunt.service';
import { GemHuntScanner } from './gem-hunt.scanner';
import { MemeCoinScanner } from './meme-coin.scanner';
import { SocialSignalScanner } from './social-signal.scanner';
import { TrendRadar } from './trend-radar';
import { ContractSafetyScanner } from './contract-safety.scanner';
import { GemResearchEngine } from './gem-research.engine';
import { CoinGeckoScanner } from './coingecko.scanner';
import { GeckoTerminalScanner } from './geckoterminal.scanner';
import { WhaleTracker } from './whale-tracker';
import { GemHuntController } from './gem-hunt.controller';
import { GemPerformanceService } from './gem-performance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'gem-hunt' }),
    PrismaModule,
    TelegramModule,
    ScoringModule,
  ],
  controllers: [GemHuntController],
  providers: [
    GemHuntService,
    GemHuntScanner,
    MemeCoinScanner,
    SocialSignalScanner,
    TrendRadar,
    ContractSafetyScanner,
    GemResearchEngine,
    CoinGeckoScanner,
    GeckoTerminalScanner,
    WhaleTracker,
    GemPerformanceService,
  ],
  exports: [GemHuntService, GemPerformanceService],
})
export class GemHuntModule {}
