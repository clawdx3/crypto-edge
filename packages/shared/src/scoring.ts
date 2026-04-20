import { RegimeLabel } from './enums';

export interface RegimeSignalInput {
  btcTrendScore: number;
  ethTrendScore: number;
  stablecoinFlowScore: number;
  tvlScore: number;
  fundingScore: number;
  openInterestScore: number;
  volatilityScore: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const computeRegimeScore = (input: RegimeSignalInput): { totalScore: number; label: RegimeLabel } => {
  const totalScore = clamp(
    Math.round(
      input.btcTrendScore * 0.2 +
        input.ethTrendScore * 0.15 +
        input.stablecoinFlowScore * 0.2 +
        input.tvlScore * 0.15 +
        input.fundingScore * 0.1 +
        input.openInterestScore * 0.1 +
        input.volatilityScore * 0.1,
    ),
    -100,
    100,
  );

  if (totalScore >= 30) {
    return { totalScore, label: RegimeLabel.RISK_ON };
  }

  if (totalScore <= -30) {
    return { totalScore, label: RegimeLabel.RISK_OFF };
  }

  return { totalScore, label: RegimeLabel.NEUTRAL };
};
