import type {
  AlertSeverity,
  AlertType,
  AssetCategory,
  CatalystStatus,
  CatalystType,
  ConvictionLevel,
  PositionStatus,
  RegimeLabel,
  SourceKind,
  WalletCategory,
} from './enums';

export interface ApiHealthContract {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

export interface AssetContract {
  id: string;
  symbol: string;
  name: string;
  chain: string;
  category: AssetCategory;
  isActive: boolean;
}

export interface SourceContract {
  id: string;
  name: string;
  kind: SourceKind;
  isEnabled: boolean;
  lastSuccessfulSyncAt: string | null;
}

export interface MarketRegimeContract {
  id: string;
  capturedAt: string;
  label: RegimeLabel;
  totalScore: number;
  notes: string | null;
}

export interface CatalystContract {
  id: string;
  assetSymbol: string;
  type: CatalystType;
  status: CatalystStatus;
  title: string;
  effectiveAt: string;
  rankScore: number;
}

export interface WalletContract {
  id: string;
  label: string;
  address: string;
  chain: string;
  category: WalletCategory;
  signalScore: number;
}

export interface PositionContract {
  id: string;
  assetSymbol: string;
  status: PositionStatus;
  conviction: ConvictionLevel;
  nextReviewAt: string | null;
}

export interface AlertContract {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  createdAt: string;
}

export interface OverviewContract {
  regime: Pick<MarketRegimeContract, 'label' | 'totalScore'>;
  catalysts: CatalystContract[];
  wallets: WalletContract[];
  alerts: AlertContract[];
}
