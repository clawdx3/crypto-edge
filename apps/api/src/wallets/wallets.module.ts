import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scoring',
    }),
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
})
export class WalletsModule {}
