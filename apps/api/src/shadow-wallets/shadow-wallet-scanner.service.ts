import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShadowWalletsService } from './shadow-wallets.service';
import { TelegramService } from '../telegram/telegram.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShadowWalletScannerService {
  private readonly logger = new Logger(ShadowWalletScannerService.name);

  constructor(
    private readonly shadowWalletsService: ShadowWalletsService,
    private readonly telegramService: TelegramService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async runScheduledScan() {
    this.logger.log('🕵️ Starting scheduled shadow-wallet scan...');

    const summary = await this.shadowWalletsService.scanAllWallets();
    this.logger.log(`scanAllWallets done: ${summary.scanned} wallets scanned, ${summary.totalNew} new positions`);

    if (summary.totalNew > 0) {
      const newPositions = await this.prisma.shadowPosition.findMany({
        where: { isNew: true },
        include: { shadowWallet: true },
      });

      for (const pos of newPositions) {
        const wallet = pos.shadowWallet;
        const alias = wallet.alias ?? wallet.label ?? wallet.address;
        const usdValue = pos.usdValue ? `$${pos.usdValue.toLocaleString()}` : 'Unknown';
        const dexUrl = `https://dexscreener.com/${pos.chain}/${pos.tokenAddress}`;

        const text =
          `🕵️ Shadow Alert — ${alias} bought ${pos.tokenSymbol}\n` +
          `💰 Value: ${usdValue}\n` +
          `🔗 Pair: ${dexUrl}`;

        try {
          await this.telegramService.sendMessage(text);
          this.logger.log(`Telegram alert sent for ${alias} buying ${pos.tokenSymbol}`);
        } catch (err: any) {
          this.logger.warn(`Telegram send failed: ${err.message}`);
        }

        await this.prisma.shadowPosition.update({
          where: { id: pos.id },
          data: { isNew: false },
        });
      }
    }

    this.logger.log('🕵️ Scheduled shadow-wallet scan complete');
  }
}
