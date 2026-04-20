import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContractSafetyReport } from './contract-safety.scanner';
import { SocialSignalResult } from './social-signal.scanner';
import { TrendingThemeResult } from './trend-radar';
import { DexScreenerToken } from './gem-hunt.scanner';

export interface GemResearchInput {
  token: DexScreenerToken;
  chain: string;
  theme: TrendingThemeResult | null;
  socialSignals: SocialSignalResult[];
  safetyReport: ContractSafetyReport;
  // New signal sources
  coingeckoGem?: { signalStrength: number; upsidePotential: number };
  geckoTerminalPool?: { isNew: boolean; volume24h: number; liquidity: number };
  dexToolsAnnouncement?: { estimatedMC: number };
  whaleBuy?: { walletName: string; amountUsd: number };
}

export interface TokenResearchReportOutput {
  tokenAddress: string;
  chain: string;
  tokenName: string | null;
  signalSource: string | null;
  signalText: string | null;
  mintAuthority: boolean | null;
  freezeAuthority: boolean | null;
  lpBurningStatus: string | null;
  lpAmount: string | null;
  lpLockDuration: string | null;
  renounced: boolean | null;
  isHoneypot: boolean | null;
  isProxy: boolean | null;
  proxyAddress: string | null;
  rugScore: number;
  twitterHandle: string | null;
  twitterFollowers: number | null;
  twitterBio: string | null;
  redditSubreddit: string | null;
  redditMembers: number | null;
  telegramGroup: string | null;
  telegramMembers: number | null;
  website: string | null;
  teamDoxxed: boolean;
  teamNames: unknown;
  teamPrevTokens: unknown;
  thesis: 'BUY' | 'HOLD' | 'AVOID';
  thesisStrength: number;
  thesisReasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  marketCap: string | null;
  liquidity: string | null;
  volume24h: string | null;
  price: string | null;
  priceChange24h: string | null;
  pairAddress: string | null;
  dexId: string | null;
}

@Injectable()
export class GemResearchEngine {
  private readonly logger = new Logger(GemResearchEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a full DD research report for a token.
   */
  async generateReport(input: GemResearchInput): Promise<TokenResearchReportOutput> {
    const { token, chain, theme, socialSignals, safetyReport, coingeckoGem, geckoTerminalPool, dexToolsAnnouncement, whaleBuy } = input;

    // Collect social signal data
    const twitterSignal = socialSignals.find((s) => s.platform === 'twitter');
    const redditSignal = socialSignals.find((s) => s.platform === 'reddit');
    const combinedSentiment = this.calcCombinedSentiment(socialSignals);
    const totalReach = this.calcTotalReach(socialSignals);
    const avgEngagement = this.calcAvgEngagement(socialSignals);

    // Calculate thesis components
    const socialScore = this.scoreSocialSignal(theme, socialSignals, token);
    const safetyScore = safetyReport.rugScore;
    const onChainScore = this.scoreOnChain(token);

    // Determine thesis and strength
    const thesisParams: Parameters<typeof this.determineThesis>[0] = {
      socialScore,
      safetyScore,
      onChainScore,
      combinedSentiment,
      totalReach,
      avgEngagement,
      theme,
      token,
      safetyReport,
      twitterSignal,
      redditSignal,
    };
    if (coingeckoGem) thesisParams.coingeckoGem = coingeckoGem;
    if (geckoTerminalPool) thesisParams.geckoTerminalPool = geckoTerminalPool;
    if (dexToolsAnnouncement) thesisParams.dexToolsAnnouncement = dexToolsAnnouncement;
    if (whaleBuy) thesisParams.whaleBuy = whaleBuy;
    const { thesis, strength, reasoning } = this.determineThesis(thesisParams);

    const riskLevel = this.determineRiskLevel(safetyReport, socialScore, token);

    // Build sample post from social signals
    const samplePosts = socialSignals
      .flatMap((s) => s.samplePosts ?? [])
      .slice(0, 3)
      .map((p) => ({ text: p.text, likes: p.likes, rt: p.rt, url: p.url }));

    const report: TokenResearchReportOutput = {
      tokenAddress: token.address,
      chain,
      tokenName: token.name ?? null,
      signalSource: theme?.theme ?? null,
      signalText: samplePosts[0]?.text ?? null,

      // Contract Safety
      mintAuthority: safetyReport.mintAuthority,
      freezeAuthority: safetyReport.freezeAuthority,
      lpBurningStatus: safetyReport.lpBurningStatus,
      lpAmount: safetyReport.lpAmount,
      lpLockDuration: safetyReport.lpLockDuration,
      renounced: safetyReport.renounced,
      isHoneypot: safetyReport.isHoneypot,
      isProxy: safetyReport.isProxy,
      proxyAddress: safetyReport.proxyAddress,
      rugScore: safetyReport.rugScore,

      // Social Presence
      twitterHandle: twitterSignal?.keyword ?? null,
      twitterFollowers: null,
      twitterBio: null,
      redditSubreddit: redditSignal ? 'CryptoMoonShots' : null,
      redditMembers: redditSignal?.postCount ?? null,
      telegramGroup: null,
      telegramMembers: null,
      website: null,

      // Team
      teamDoxxed: false,
      teamNames: [],
      teamPrevTokens: [],

      // Thesis
      thesis,
      thesisStrength: strength,
      thesisReasoning: reasoning,
      riskLevel,

      // On-chain
      marketCap: token.marketCap ?? null,
      liquidity: token.liquidity ?? null,
      volume24h: token.volume24h ?? null,
      price: token.priceUsd ?? null,
      priceChange24h: token.priceChange?.h24 ?? null,
      pairAddress: token.pairAddress ?? null,
      dexId: token.dexId ?? null,
    };

    // Store report in DB
    await this.storeReport(report);

    return report;
  }

  private calcCombinedSentiment(signals: SocialSignalResult[]): number {
    if (signals.length === 0) return 0;
    const totalWeight = signals.reduce((s, sig) => s + sig.postCount, 0);
    if (totalWeight === 0) return 0;
    return signals.reduce(
      (sum, sig) => sum + sig.sentiment * (sig.postCount / totalWeight),
      0,
    );
  }

  private calcTotalReach(signals: SocialSignalResult[]): number {
    return signals.reduce((sum, sig) => sum + Number(sig.reach), 0);
  }

  private calcAvgEngagement(signals: SocialSignalResult[]): number {
    if (signals.length === 0) return 0;
    return signals.reduce((sum, sig) => sum + sig.avgEngagement, 0) / signals.length;
  }

  private scoreSocialSignal(
    theme: TrendingThemeResult | null,
    signals: SocialSignalResult[],
    _token: DexScreenerToken,
  ): number {
    if (signals.length === 0) return 0;

    let score = 0;

    // Theme match bonus
    if (theme) {
      if (theme.momentum === 'rising') score += 25;
      else if (theme.momentum === 'peak') score += 15;
    }

    // Sentiment bonus (0-30 pts)
    const sentiment = this.calcCombinedSentiment(signals);
    if (sentiment > 0.5) score += 30;
    else if (sentiment > 0.2) score += 20;
    else if (sentiment > 0) score += 10;
    else if (sentiment < -0.2) score -= 20;

    // Volume/velocity bonus (0-25 pts)
    const totalPosts = signals.reduce((s, sig) => s + sig.postCount, 0);
    if (totalPosts > 50) score += 25;
    else if (totalPosts > 20) score += 20;
    else if (totalPosts > 10) score += 15;
    else if (totalPosts > 5) score += 10;

    // Reach bonus (0-20 pts)
    const reach = this.calcTotalReach(signals);
    if (reach > 1_000_000) score += 20;
    else if (reach > 100_000) score += 15;
    else if (reach > 10_000) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  private scoreOnChain(token: DexScreenerToken): number {
    let score = 0;

    const mc = parseFloat(token.marketCap ?? '0');
    const liq = parseFloat(token.liquidity ?? '0');
    const vol = parseFloat(token.volume24h ?? '0');
    const change = parseFloat(token.priceChange?.h24 ?? '0');
    const buys = token.txns?.h24?.buys ?? 0;
    const sells = token.txns?.h24?.sells ?? 1;

    // Market cap sweet spot (0-20 pts)
    if (mc > 0 && mc < 50_000) score += 20;
    else if (mc < 200_000) score += 15;
    else if (mc < 1_000_000) score += 10;
    else if (mc < 5_000_000) score += 5;

    // Liquidity (0-20 pts)
    if (liq > 100_000) score += 20;
    else if (liq > 50_000) score += 15;
    else if (liq > 20_000) score += 10;
    else if (liq > 5_000) score += 5;

    // Volume (0-15 pts)
    if (vol > 200_000) score += 15;
    else if (vol > 100_000) score += 12;
    else if (vol > 50_000) score += 8;
    else if (vol > 10_000) score += 5;

    // Momentum (0-20 pts)
    if (change > 50) score += 20;
    else if (change > 20) score += 15;
    else if (change > 10) score += 10;
    else if (change > 0) score += 5;
    else if (change < -20) score -= 15;

    // Buy/sell ratio (0-15 pts)
    const ratio = buys / sells;
    if (ratio > 5) score += 15;
    else if (ratio > 3) score += 10;
    else if (ratio > 1) score += 5;
    else if (ratio < 0.5) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private determineThesis(params: {
    socialScore: number;
    safetyScore: number;
    onChainScore: number;
    combinedSentiment: number;
    totalReach: number;
    avgEngagement: number;
    theme: TrendingThemeResult | null;
    token: DexScreenerToken;
    safetyReport: ContractSafetyReport;
    twitterSignal: SocialSignalResult | undefined;
    redditSignal: SocialSignalResult | undefined;
    coingeckoGem?: { signalStrength: number; upsidePotential: number };
    geckoTerminalPool?: { isNew: boolean; volume24h: number; liquidity: number };
    dexToolsAnnouncement?: { estimatedMC: number };
    whaleBuy?: { walletName: string; amountUsd: number };
  }): { thesis: 'BUY' | 'HOLD' | 'AVOID'; strength: number; reasoning: string } {
    const {
      socialScore, safetyScore, onChainScore,
      combinedSentiment, avgEngagement, theme, token,
      safetyReport, twitterSignal, redditSignal,
      coingeckoGem, geckoTerminalPool, dexToolsAnnouncement, whaleBuy,
    } = params;

    // Weighted composite score
    // Social: 35%, Safety: 35%, On-chain: 30%
    let composite = (socialScore * 0.35) + (safetyScore * 0.35) + (onChainScore * 0.30);

    // New signal bonuses
    // CoinGecko trending = bonus points (coins already getting attention)
    if (coingeckoGem) {
      composite += (coingeckoGem.signalStrength / 100) * 10; // up to +10
      if (coingeckoGem.upsidePotential > 2) composite += 5; // high upside potential
    }
    // GeckoTerminal new pool = bonus (fresh liquidity)
    if (geckoTerminalPool) {
      if (geckoTerminalPool.isNew) composite += 8;
      if (geckoTerminalPool.liquidity > 50_000) composite += 7;
    }
    // DEXTools announcement = strong signal (dev is marketing)
    if (dexToolsAnnouncement) {
      composite += 10;
      if (dexToolsAnnouncement.estimatedMC < 500_000) composite += 5; // early announcement
    }
    // Whale buy = very strong signal (smart money moving)
    if (whaleBuy) {
      composite += 15;
      if (whaleBuy.amountUsd > 10_000) composite += 5;
    }

    // AVOID conditions
    if (safetyReport.isHoneypot === true) {
      return {
        thesis: 'AVOID',
        strength: 100,
        reasoning: 'Honeypot contract detected. This token cannot be sold after purchase. Do NOT interact with this contract regardless of social signals.',
      };
    }

    if (safetyScore < 20) {
      return {
        thesis: 'AVOID',
        strength: 80,
        reasoning: `Critical contract risks detected (rug score: ${safetyScore}/100). Mint authority active, LP unlocked, or other severe red flags present.`,
      };
    }

    if (composite < 30) {
      return {
        thesis: 'AVOID',
        strength: 60,
        reasoning: `Insufficient signals across social, safety, and on-chain metrics. Composite score: ${composite.toFixed(0)}/100. No clear bull case.`,
      };
    }

    // HOLD conditions
    if (composite >= 30 && composite < 55) {
      return {
        thesis: 'HOLD',
        strength: Math.round(composite),
        reasoning: this.buildHoldReasoning(params),
      };
    }

    // BUY conditions
    if (composite >= 55) {
      return {
        thesis: 'BUY',
        strength: Math.round(composite),
        reasoning: this.buildBuyReasoning(params),
      };
    }

    // Fallback
    return {
      thesis: 'HOLD',
      strength: 50,
      reasoning: 'Insufficient data to form a strong thesis. Monitor for additional signals.',
    };
  }

  private buildBuyReasoning(p: {
    socialScore: number;
    safetyScore: number;
    onChainScore: number;
    combinedSentiment: number;
    avgEngagement: number;
    theme: TrendingThemeResult | null;
    token: DexScreenerToken;
    safetyReport: ContractSafetyReport;
    twitterSignal: SocialSignalResult | undefined;
    redditSignal: SocialSignalResult | undefined;
    coingeckoGem?: { signalStrength: number; upsidePotential: number };
    geckoTerminalPool?: { isNew: boolean; volume24h: number; liquidity: number };
    dexToolsAnnouncement?: { estimatedMC: number };
    whaleBuy?: { walletName: string; amountUsd: number };
  }): string {
    const lines: string[] = [];

    if (p.theme) {
      lines.push(`${p.theme.theme} narrative is ${p.theme.momentum}.`);
    }

    if (p.twitterSignal && p.twitterSignal.postCount > 5) {
      lines.push(`Twitter buzz: ${p.twitterSignal.postCount} mentions, sentiment ${(p.combinedSentiment * 100).toFixed(0)}% positive.`);
    }

    if (p.redditSignal && p.redditSignal.postCount > 3) {
      lines.push(`Reddit (r/CryptoMoonShots): ${p.redditSignal.postCount} related posts detected.`);
    }

    if (p.safetyReport.rugScore >= 70) {
      lines.push(`Contract safety strong (${p.safetyReport.rugScore}/100).`);
    }

    if (p.safetyReport.lpBurningStatus === 'burned') {
      lines.push('LP tokens BURNED — no rug via liquidity removal.');
    }

    if (p.safetyReport.mintAuthority === true) {
      lines.push('Mint authority REVOKED — no more tokens can be created.');
    }

    const mc = parseFloat(p.token.marketCap ?? '0');
    const liq = parseFloat(p.token.liquidity ?? '0');
    const change = parseFloat(p.token.priceChange?.h24 ?? '0');

    if (mc < 200_000) lines.push(`Early stage — MC $${(mc / 1000).toFixed(0)}K, upside potential.`);
    if (liq > 20_000) lines.push(`$${(liq / 1000).toFixed(0)}K liquidity provides reasonable entry/exit.`);
    if (change > 20) lines.push(`${change.toFixed(1)}% 24h price momentum.`);
    if (p.avgEngagement > 100) lines.push(`High engagement (avg ${p.avgEngagement.toFixed(0)} per post) indicates genuine community interest.`);

    // New signal bonuses
    if (p.coingeckoGem) lines.push(`CoinGecko trending: CG signal ${p.coingeckoGem.signalStrength}/100, ${p.coingeckoGem.upsidePotential.toFixed(1)}x upside potential.`);
    if (p.geckoTerminalPool?.isNew) lines.push(`Fresh pool on GeckoTerminal with $${(p.geckoTerminalPool.liquidity / 1000).toFixed(0)}K liquidity.`);
    if (p.dexToolsAnnouncement) lines.push(`Dev is marketing — new token announced on DEXTools (est. MC: $${((p.dexToolsAnnouncement.estimatedMC ?? 0) / 1000).toFixed(0)}K).`);
    if (p.whaleBuy) lines.push(`🐋 Whale signal: ${p.whaleBuy.walletName} bought $${(p.whaleBuy.amountUsd / 1000).toFixed(0)}K — smart money moving.`);

    if (lines.length === 0) {
      lines.push('All key metrics are positive. Composite score above threshold.');
    }

    lines.push('');
    lines.push('⚠️ Risk: This is NOT financial advice. Always do your own DD.');

    return lines.join(' ');
  }

  private buildHoldReasoning(p: {
    socialScore: number;
    safetyScore: number;
    onChainScore: number;
    combinedSentiment: number;
    theme: TrendingThemeResult | null;
    token: DexScreenerToken;
    coingeckoGem?: { signalStrength: number; upsidePotential: number };
    geckoTerminalPool?: { isNew: boolean; volume24h: number; liquidity: number };
    dexToolsAnnouncement?: { estimatedMC: number };
    whaleBuy?: { walletName: string; amountUsd: number };
  }): string {
    const lines: string[] = [];

    if (p.theme) {
      lines.push(`Theme: ${p.theme.theme}.`);
    }

    lines.push(`Composite score ${((p.socialScore * 0.35 + p.safetyScore * 0.35 + p.onChainScore * 0.30)).toFixed(0)}/100 — moderate conviction.`);

    const mc = parseFloat(p.token.marketCap ?? '0');
    if (mc > 1_000_000) lines.push(`Market cap $${(mc / 1_000_000).toFixed(2)}M — already past the gem stage.`);

    const liq = parseFloat(p.token.liquidity ?? '0');
    if (liq < 10_000) lines.push('Low liquidity — caution on entry/exit.');

    if (p.safetyScore < 50) lines.push('Contract safety concerns warrant caution.');

    lines.push('');
    lines.push('💡 Thesis: Wait for better entry or stronger social confirmation before committing capital.');

    return lines.join(' ');
  }

  private determineRiskLevel(
    report: ContractSafetyReport,
    socialScore: number,
    token: DexScreenerToken,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    const mc = parseFloat(token.marketCap ?? '0');

    // EXTREME risk conditions
    if (report.isHoneypot === true) return 'EXTREME';
    if (report.mintAuthority === false && report.renounced === false) return 'EXTREME';
    if (mc < 5_000 && socialScore < 20) return 'EXTREME';

    // HIGH risk
    if (report.rugScore < 30) return 'HIGH';
    if (report.lpBurningStatus === 'unlocked' && report.mintAuthority === false) return 'HIGH';

    // MEDIUM risk
    if (report.rugScore < 55) return 'MEDIUM';
    if (report.lpBurningStatus === 'unlocked') return 'MEDIUM';
    if (mc < 10_000) return 'MEDIUM';

    // LOW risk — requires strong safety score and burned LP or locked LP
    if (report.rugScore >= 70 && ['burned', 'locked'].includes(report.lpBurningStatus)) {
      return 'LOW';
    }

    return 'MEDIUM';
  }

  private async storeReport(report: TokenResearchReportOutput): Promise<void> {
    try {
      await this.prisma.tokenResearchReport.upsert({
        where: {
          tokenAddress_chain: {
            tokenAddress: report.tokenAddress,
            chain: report.chain,
          },
        },
        update: {
          tokenName: report.tokenName,
          signalSource: report.signalSource,
          signalText: report.signalText,
          mintAuthority: report.mintAuthority,
          freezeAuthority: report.freezeAuthority,
          lpBurningStatus: report.lpBurningStatus,
          lpAmount: report.lpAmount,
          lpLockDuration: report.lpLockDuration,
          renounced: report.renounced,
          isHoneypot: report.isHoneypot,
          isProxy: report.isProxy,
          proxyAddress: report.proxyAddress,
          rugScore: report.rugScore,
          twitterHandle: report.twitterHandle,
          twitterFollowers: report.twitterFollowers,
          twitterBio: report.twitterBio,
          redditSubreddit: report.redditSubreddit,
          redditMembers: report.redditMembers,
          telegramGroup: report.telegramGroup,
          telegramMembers: report.telegramMembers,
          website: report.website,
          teamDoxxed: report.teamDoxxed,
          teamNames: report.teamNames as any,
          teamPrevTokens: report.teamPrevTokens as any,
          thesis: report.thesis,
          thesisStrength: report.thesisStrength,
          thesisReasoning: report.thesisReasoning,
          riskLevel: report.riskLevel,
          marketCap: report.marketCap,
          liquidity: report.liquidity,
          volume24h: report.volume24h,
          price: report.price,
          priceChange24h: report.priceChange24h,
          pairAddress: report.pairAddress,
          dexId: report.dexId,
        },
        create: {
          tokenAddress: report.tokenAddress,
          chain: report.chain,
          tokenName: report.tokenName,
          signalSource: report.signalSource,
          signalText: report.signalText,
          mintAuthority: report.mintAuthority,
          freezeAuthority: report.freezeAuthority,
          lpBurningStatus: report.lpBurningStatus,
          lpAmount: report.lpAmount,
          lpLockDuration: report.lpLockDuration,
          renounced: report.renounced,
          isHoneypot: report.isHoneypot,
          isProxy: report.isProxy,
          proxyAddress: report.proxyAddress,
          rugScore: report.rugScore,
          twitterHandle: report.twitterHandle,
          twitterFollowers: report.twitterFollowers,
          twitterBio: report.twitterBio,
          redditSubreddit: report.redditSubreddit,
          redditMembers: report.redditMembers,
          telegramGroup: report.telegramGroup,
          telegramMembers: report.telegramMembers,
          website: report.website,
          teamDoxxed: report.teamDoxxed,
          teamNames: report.teamNames as any,
          teamPrevTokens: report.teamPrevTokens as any,
          thesis: report.thesis,
          thesisStrength: report.thesisStrength,
          thesisReasoning: report.thesisReasoning,
          riskLevel: report.riskLevel,
          marketCap: report.marketCap,
          liquidity: report.liquidity,
          volume24h: report.volume24h,
          price: report.price,
          priceChange24h: report.priceChange24h,
          pairAddress: report.pairAddress,
          dexId: report.dexId,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to store research report: ${err.message}`);
    }
  }
}
