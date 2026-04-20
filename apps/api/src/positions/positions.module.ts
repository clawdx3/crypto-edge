import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PositionsController } from './positions.controller';
import { PositionsService } from './positions.service';
import { PositionScheduler } from './position-scheduler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scoring',
    }),
  ],
  controllers: [PositionsController],
  providers: [PositionsService, PositionScheduler],
})
export class PositionsModule {}
