import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ShadowWalletsController } from './shadow-wallets.controller';
import { ShadowWalletsService } from './shadow-wallets.service';
import { ShadowWalletScannerService } from './shadow-wallet-scanner.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [ShadowWalletsController],
  providers: [ShadowWalletsService, ShadowWalletScannerService],
  exports: [ShadowWalletsService, ShadowWalletScannerService],
})
export class ShadowWalletsModule {}
