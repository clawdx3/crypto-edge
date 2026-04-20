import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CatalystsController } from './catalysts.controller';
import { CatalystsService } from './catalysts.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scoring',
    }),
  ],
  controllers: [CatalystsController],
  providers: [CatalystsService],
})
export class CatalystsModule {}
