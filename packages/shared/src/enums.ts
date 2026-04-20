export enum RegimeLabel {
  RISK_ON = 'risk_on',
  NEUTRAL = 'neutral',
  RISK_OFF = 'risk_off',
}

export enum CatalystType {
  UNLOCK = 'unlock',
  LISTING = 'listing',
  GOVERNANCE_VOTE = 'governance_vote',
  TREASURY_MOVE = 'treasury_move',
  STAKING_CHANGE = 'staking_change',
  PROTOCOL_UPGRADE = 'protocol_upgrade',
  INCENTIVE_PROGRAM = 'incentive_program',
  FUNDRAISING = 'fundraising',
}

export enum CatalystStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum WalletCategory {
  SMART_TRADER = 'smart_trader',
  TEAM = 'team',
  TREASURY = 'treasury',
  FUND = 'fund',
  MARKET_MAKER = 'market_maker',
  DEPLOYER = 'deployer',
  WATCHLIST = 'watchlist',
}

export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  WATCHLIST = 'watchlist',
  INVALIDATED = 'invalidated',
}

export enum ConvictionLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum AlertType {
  DAILY_BRIEF = 'daily_brief',
  CATALYST = 'catalyst',
  WALLET = 'wallet',
  POSITION = 'position',
  RISK = 'risk',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum SourceKind {
  COINGECKO = 'coingecko',
  DEFILLAMA = 'defillama',
  ETHERSCAN = 'etherscan',
  MANUAL = 'manual',
  SNAPSHOT = 'snapshot',
  EXCHANGE = 'exchange',
}

export enum AssetCategory {
  DEFI = 'defi',
  INFRA = 'infra',
  L2 = 'l2',
  GAMING = 'gaming',
  AI = 'ai',
  OTHER = 'other',
}
