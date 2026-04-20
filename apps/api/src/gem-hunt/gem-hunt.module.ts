import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { GemHuntService } from './gem-hunt.service';
import { GemHuntScanner } from './gem-hunt.scanner';
import { MemeCoinScanner } from './meme-coin.scanner';
import { GemHuntController } from './gem-hunt.controller';
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
  providers: [GemHuntService, GemHuntScanner, MemeCoinScanner],
  exports: [GemHuntService],
})
export class GemHuntModule {}
