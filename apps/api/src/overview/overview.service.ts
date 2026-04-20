import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  AlertType,
  CatalystStatus,
  CatalystType,
  RegimeLabel,
  WalletCategory,
  type OverviewContract,
} from '@crypto-edge/shared';

@Injectable()
export class OverviewService {
  getOverview(): OverviewContract {
    return {
      regime: {
        label: RegimeLabel.NEUTRAL,
        totalScore: 18,
      },
      catalysts: [
        {
          id: 'catalyst-1',
          assetSymbol: 'ETH',
          type: CatalystType.PROTOCOL_UPGRADE,
          status: CatalystStatus.UPCOMING,
          title: 'Protocol upgrade placeholder',
          effectiveAt: '2026-04-28T12:00:00.000Z',
          rankScore: 72,
        },
      ],
      wallets: [
        {
          id: 'wallet-1',
          label: 'Research wallet placeholder',
          address: '0x0000000000000000000000000000000000000001',
          chain: 'ethereum',
          category: WalletCategory.WATCHLIST,
          signalScore: 81,
        },
      ],
      alerts: [
        {
          id: 'alert-1',
          type: AlertType.DAILY_BRIEF,
          severity: AlertSeverity.INFO,
          title: 'Daily brief delivery scaffold',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
}
