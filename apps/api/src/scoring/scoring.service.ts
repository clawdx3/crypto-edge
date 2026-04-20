import { Injectable, Logger } from '@nestjs/common';

export interface ScoringStatus {
  version: string;
  domains: string[];
}

export interface RegimeScoreResult {
  btcTrendScore: number;
  ethTrendScore: number;
  stablecoinFlowScore: number;
  tvlScore: number;
  fundingScore: number;
  openInterestScore: number;
  volatilityScore: number;
  totalScore: number;
  label: 'risk_on' | 'neutral' | 'risk_off';
}

export interface CatalystRankResult {
  id: string;
  rankScore: number;
  urgencyScore: number;
  impactScore: number;
  confidenceScore: number;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  getStatus(): ScoringStatus {
    return {
      version: '0.1.0-foundation',
      domains: ['regime', 'catalysts', 'wallets', 'positions'],
    };
  }

  // Regime scoring: -100 to +100
  calculateRegimeScore(inputs: {
    btcTrend: number;      // -1 to 1
    ethTrend: number;      // -1 to 1
    stablecoinFlow: number; // -1 to 1
    tvlDelta: number;       // -1 to 1
    funding: number;        // -1 to 1
    openInterest: number;   // -1 to 1
    volatility: number;     // -1 to 1
  }): { totalScore: number; label: 'risk_on' | 'neutral' | 'risk_off'; breakdown: Record<string, number> } {
    const weights = {
      btcTrend: 0.25,
      ethTrend: 0.20,
      stablecoinFlow: 0.15,
      tvlDelta: 0.12,
      funding: 0.10,
      openInterest: 0.10,
      volatility: 0.08,
    };
    const raw = Object.entries(inputs).reduce((sum, [key, val]) => {
      return sum + (val * (weights[key as keyof typeof weights] ?? 0));
    }, 0);
    const totalScore = Math.round(raw * 100);
    const label = totalScore >= 25 ? 'risk_on' : totalScore <= -25 ? 'risk_off' : 'neutral';
    const breakdown = { ...inputs, weighted: raw };
    return { totalScore, label, breakdown };
  }

  // Catalyst rank scoring: 0-100
  calculateCatalystRank(catalyst: {
    impactScore: number;     // 0-100
    confidenceScore: number; // 0-100
    urgencyScore: number;    // 0-100
    daysUntilEffective?: number;
  }): number {
    const weights = { impact: 0.45, confidence: 0.30, urgency: 0.25 };
    const base = catalyst.impactScore * weights.impact
      + catalyst.confidenceScore * weights.confidence
      + catalyst.urgencyScore * weights.urgency;
    // Boost if catalyst is imminent (within 7 days)
    if (catalyst.daysUntilEffective !== undefined && catalyst.daysUntilEffective <= 7) {
      const proximityBoost = (7 - catalyst.daysUntilEffective) / 7 * 10;
      return Math.min(100, Math.round(base + proximityBoost));
    }
    return Math.round(base);
  }

  // Wallet quality scoring: 0-100
  calculateWalletScore(wallet: {
    totalPnl: number;
    winRate: number;         // 0-1
    avgHoldingPeriodDays: number;
    specialization: string[]; // e.g. ['defi', 'layer2']
  }): { totalScore: number; breakdown: Record<string, number> } {
    const pnlScore = Math.min(100, Math.max(0, (wallet.totalPnl / 100000) * 50 + 50));
    const winRateScore = wallet.winRate * 30;
    const holdingScore = Math.min(20, wallet.avgHoldingPeriodDays / 7 * 20);
    const specialScore = Math.min(10, wallet.specialization.length * 3.33);
    const total = pnlScore + winRateScore + holdingScore + specialScore;
    return {
      totalScore: Math.round(Math.min(100, total)),
      breakdown: { pnlScore: Math.round(pnlScore), winRateScore: Math.round(winRateScore), holdingScore: Math.round(holdingScore), specialScore: Math.round(specialScore) }
    };
  }

  // Position risk scoring: 0-100
  calculatePositionRisk(position: {
    concentrationPct: number;    // portfolio %
    daysSinceReview: number;
    conviction: 'low' | 'medium' | 'high';
    nearCatalystWindow: boolean;
    correlationWithOtherPositions: number; // 0-1
  }): { totalRiskScore: number; breakdown: Record<string, number> } {
    const concentrationRisk = position.concentrationPct > 25 ? (position.concentrationPct - 25) * 2 : 0;
    const stalenessRisk = Math.min(30, position.daysSinceReview * 5);
    const convictionRisk = position.conviction === 'low' ? 25 : position.conviction === 'medium' ? 10 : 0;
    const catalystRisk = position.nearCatalystWindow ? 15 : 0;
    const correlationRisk = position.correlationWithOtherPositions * 20;
    const total = concentrationRisk + stalenessRisk + convictionRisk + catalystRisk + correlationRisk;
    return {
      totalRiskScore: Math.min(100, Math.round(total)),
      breakdown: { concentrationRisk: Math.round(concentrationRisk), stalenessRisk: Math.round(stalenessRisk), convictionRisk: Math.round(convictionRisk), catalystRisk: Math.round(catalystRisk), correlationRisk: Math.round(correlationRisk) }
    };
  }
}
