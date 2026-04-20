import { Injectable, Logger } from '@nestjs/common';

export interface IngestionStatus {
  adapters: string[];
  message: string;
  lastSyncAt?: string;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  getStatus(): IngestionStatus {
    return {
      adapters: ['market', 'catalysts', 'wallets'],
      message: 'Scaffold. Background jobs and external provider integrations are deferred.',
    };
  }

  async syncMarketMetrics(): Promise<{ message: string }> {
    this.logger.log('syncMarketMetrics called - would fetch market data from providers');
    return { message: 'Market metrics sync triggered (scaffold)' };
  }

  async syncCatalysts(): Promise<{ message: string }> {
    this.logger.log('syncCatalysts called - would sync catalyst events');
    return { message: 'Catalysts sync triggered (scaffold)' };
  }

  async syncWalletTransactions(walletId: string): Promise<{ message: string }> {
    this.logger.log(`syncWalletTransactions called for wallet: ${walletId}`);
    return { message: `Wallet transactions sync triggered for ${walletId} (scaffold)` };
  }
}
