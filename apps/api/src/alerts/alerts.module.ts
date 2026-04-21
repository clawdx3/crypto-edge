import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TelegramModule } from '../telegram/telegram.module';
import { ScoringModule } from '../scoring/scoring.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertScheduler } from './alert-scheduler';

@Module({
  imports: [ScheduleModule.forRoot(), TelegramModule, ScoringModule],
  controllers: [AlertsController],
  providers: [AlertsService, AlertScheduler],
})
export class AlertsModule {}
