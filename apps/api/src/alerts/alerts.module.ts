import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertScheduler } from './alert-scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AlertsController],
  providers: [AlertsService, AlertScheduler],
})
export class AlertsModule {}
