import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { GemHuntScanner, DexScreenerToken } from './gem-hunt.scanner';
import { MemeCoinScanner } from './meme-coin.scanner';
import { SocialSignalScanner } from './social-signal.scanner';
import { TrendRadar } from './trend-radar';
import { ContractSafetyScanner } from './contract-safety.scanner';
import { GemResearchEngine } from './gem-research.engine';
import { CoinGeckoScanner, TrendingCoinResult } from './coingecko.scanner';
import { GeckoTerminalScanner } from './geckoterminal.scanner';
import { DEXToolsScanner } from './dextools.scanner';
import { WhaleTracker, WhaleTransfer } from './whale-tracker';

@Injectable()
export class GemHuntService {
  private readonly logger = new Logger(GemHuntService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: GemHuntScanner,
    private readonly memeScanner: MemeCoinScanner,
    private readonly socialScanner: SocialSignalScanner,
    private readonly trendRadar: TrendRadar,
    private readonly safetyScanner: ContractSafetyScanner,
    private readonly researchEngine: GemResearchEngine,
    private readonly coinGeckoScanner: CoinGeckoScanner,
    private readonly geckoTerminalScanner: GeckoTerminalScanner,
    private readonly dexToolsScanner: DEXToolsScanner,
    private readonly whaleTracker: WhaleTracker,
    private readonly telegramService: TelegramService,
  ) {}

  // ─── Scheduled Scans ──────────────────────────────────────────────────────

  /** Main social-first scan — runs every 5 minutes */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async runGemScan() {
    this.logger.log('🔍 Starting social-first gem hunt scan...');

    const configs = await this.prisma.gemHuntConfig.findMany({ where: { isActive: true } });
    if (configs.length === 0) {
      await this.prisma.gemHuntConfig.create({
        data: {
          name: 'Default Solana Gem Hunt',
          chain: 'solana',
          minMarketCapUsd: 1000,
          maxMarketCapUsd: 5_000_000,
          minLiquidityUsd: 10_000,
          minVolume24h: 10_000,
          notificationEnabled: true,
          isActive: true,
        },
      });
      return;
    }

    for (const config of configs) {
      await this.socialFirstScan(config.chain);
    }
  }

  /** Trend radar scan — runs every 3 minutes to catch catalysts early */
  @Cron('*/3 * * * *')
  async runTrendRadarScan() {
    try {
      const themes = await this.trendRadar.scan();
      this.logger.log(`TrendRadar: detected ${themes.length} themes — ${themes.map((t) => `${t.theme}(${t.momentum})`).join(', ')}`);
    } catch (err: any) {
      this.logger.warn(`TrendRadar scan error: ${err.message}`);
    }
  }

  /** CoinGecko trending scan — runs every 5 minutes, after TrendRadar */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async runCoinGeckoScan() {
    if (process.env['COINGECKO_ENABLED'] === 'false') return;
    try {
      const gems = await this.coinGeckoScanner.scanTrendingGems();
      this.logger.log(`CoinGecko: found ${gems.length} pre-pump gems`);
      for (const gem of gems) {
        if ((gem.signalStrength ?? 0) > 70 && gem.dexPair) {
          await this.processCoinGeckoGem(gem);
        }
      }
    } catch (err: any) {
      this.logger.warn(`CoinGecko scan error: ${err.message}`);
    }
  }

  /** GeckoTerminal scan — runs every 5 minutes, fresh liquidity events */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async runGeckoTerminalScan() {
    if (process.env['GECKOTERMINAL_ENABLED'] === 'false') return;
    try {
      const network = 'solana';
      const [topPools, newPools] = await Promise.all([
        this.geckoTerminalScanner.scanTopPools(network),
        this.geckoTerminalScanner.getNewPools(network, 30),
      ]);
      this.logger.log(`GeckoTerminal: ${topPools.length} top pools, ${newPools.length} new pools`);
      // Process high-signal new pools
      for (const pool of newPools.slice(0, 5)) {
        await this.processGeckoTerminalPool(pool);
      }
    } catch (err: any) {
      this.logger.warn(`GeckoTerminal scan error: ${err.message}`);
    }
  }

  /** DEXTools announcement scan — runs every 5 minutes */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async runDEXToolsScan() {
    if (process.env['DEXTOOLS_ENABLED'] === 'false') return;
    try {
      const chain = 'solana';
      const announcements = await this.dexToolsScanner.getNewAnnouncedTokens(chain, 20);
      this.logger.log(`DEXTools: ${announcements.length} new announcements on ${chain}`);
      for (const ann of announcements.slice(0, 5)) {
        if ((ann.estimatedMC ?? 0) < 2_000_000) {
          await this.processDEXToolsAnnouncement(ann);
        }
      }
    } catch (err: any) {
      this.logger.warn(`DEXTools scan error: ${err.message}`);
    }
  }

  /** Whale tracker scan — runs every 5 minutes */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async runWhaleTrackerScan() {
    try {
      const moves = await this.whaleTracker.getRecentWhaleMoves();
      const buys = moves.filter((m) => m.type === 'buy' && (m.amountUsd ?? 0) > 1_000);
      this.logger.log(`WhaleTracker: ${moves.length} moves, ${buys.length} significant buys`);
      for (const buy of buys) {
        if (buy.tokenAddress) {
          await this.processWhaleBuy(buy);
        }
      }
    } catch (err: any) {
      this.logger.warn(`WhaleTracker scan error: ${err.message}`);
    }
  }

  // ─── Social-First Scan Pipeline ───────────────────────────────────────────

  /**
   * Social-first flow:
   * 1. TrendRadar.scan() → trending themes with catalysts
   * 2. For each rising/peak theme:
   *    a. SocialSignalScanner.searchTheme() → social data
   *    b. Search DexScreener for tokens matching theme keyword
   *    c. For each token:
   *       - ContractSafetyScanner.scan() → safety report
   *       - GemResearchEngine.generateReport() → full DD
   *       - If BUY thesis + strength > 70 → Telegram alert
   */
  async socialFirstScan(chain: string = 'solana') {
    const config = await this.prisma.gemHuntConfig.findFirst({ where: { chain, isActive: true } });
    if (!config) return;

    this.logger.log(`Social-first scan starting for ${chain}`);

    // Step 1: Get trending themes
    const themes = await this.trendRadar.scan();
    const actionableThemes = themes.filter((t) => t.momentum === 'rising' || t.momentum === 'peak');

    if (actionableThemes.length === 0) {
      this.logger.debug('No actionable themes found, scanning default keywords...');
      await this.scanDefaultKeywords(chain);
      return;
    }

    let gemsAnalyzed = 0;
    let buySignals = 0;

    for (const theme of actionableThemes.slice(0, 5)) { // Max 5 themes per cycle
      this.logger.log(`Processing theme: ${theme.theme} (${theme.momentum})`);

      // Step 2a: Get social signals for theme keywords
      for (const keyword of theme.keywords.slice(0, 3)) { // Max 3 keywords per theme
        const socialSignals = await this.socialScanner.searchTheme(keyword);

        // Step 2b: Search DexScreener for tokens matching keyword
        const tokens = await this.searchTokensByKeyword(keyword, chain);

        for (const token of tokens.slice(0, 5)) { // Max 5 tokens per keyword
          gemsAnalyzed++;

          // Step 2c: Full DD pipeline
          const safetyReport = await this.safetyScanner.scan(token.address, chain);

          const report = await this.researchEngine.generateReport({
            token,
            chain,
            theme,
            socialSignals,
            safetyReport,
          });

          // Alert on strong BUY signals
          if (report.thesis === 'BUY' && (report.thesisStrength ?? 0) > 70) {
            buySignals++;
            if (config.notificationEnabled) {
              await this.sendResearchAlert(report, theme);
            }
          }
        }
      }
    }

    this.logger.log(`Social-first scan complete: ${gemsAnalyzed} gems analyzed, ${buySignals} BUY signals`);
  }

  /**
   * Fallback: scan default keywords when no themes are actionable.
   */
  private async scanDefaultKeywords(chain: string) {
    const defaultKeywords = [
      'meme coin solana',
      'AI agent token',
      'gem found',
      'new token',
      'memecoin sniper',
    ];

    for (const keyword of defaultKeywords) {
      const socialSignals = await this.socialScanner.searchTheme(keyword);
      if (socialSignals.every((s) => s.postCount === 0)) continue;

      const tokens = await this.searchTokensByKeyword(keyword, chain);

      for (const token of tokens.slice(0, 3)) {
        const safetyReport = await this.safetyScanner.scan(token.address, chain);

        await this.researchEngine.generateReport({
          token,
          chain,
          theme: null,
          socialSignals,
          safetyReport,
        });
      }
    }
  }

  /**
   * Search DexScreener for tokens matching a keyword query.
   */
  private async searchTokensByKeyword(keyword: string, chain: string): Promise<DexScreenerToken[]> {
    try {
      // DexScreener search endpoint
      const { data } = await axios.get(
        `https://api.dexscreener.com/search?q=${encodeURIComponent(keyword)}&chain=${chain}`,
        { timeout: 10_000 },
      );

      const pairs: any[] = data?.pairs ?? [];
      return pairs
        .filter((p) => {
          const mc = parseFloat(p.baseToken?.marketCap ?? p.marketCap ?? '0');
          const liq = parseFloat(p.liquidity ?? '0');
          return mc > 1_000 && mc < 5_000_000 && liq > 5_000;
        })
        .slice(0, 10)
        .map((p) => ({
          address: p.baseToken?.address ?? p.address ?? '',
          chainId: chain,
          dexId: p.dexId ?? 'unknown',
          name: p.baseToken?.name ?? p.name ?? '',
          symbol: p.baseToken?.symbol ?? p.symbol ?? '',
          quoteTokenAddress: p.quoteToken?.address ?? '',
          priceUsd: p.priceUsd ?? p.priceUsd ?? '0',
          marketCap: p.baseToken?.marketCap ?? p.marketCap ?? '0',
          fdv: p.fdv ?? '0',
          liquidity: p.liquidity ?? '0',
          volume24h: p.volume24h ?? '0',
          priceChange: p.priceChange ?? { h24: '0' },
          txns: p.txns ?? { h24: { buys: 0, sells: 0 } },
          url: p.url ?? `https://dexscreener.com/${chain}/${p.baseToken?.address ?? p.address}`,
          pairAddress: p.pairAddress ?? p.address ?? '',
          holderCount: p.holderCount ?? '0',
        })) as DexScreenerToken[];
    } catch (err: any) {
      this.logger.warn(`DexScreener search failed for "${keyword}": ${err.message}`);
      return [];
    }
  }

  // ─── New Source Processors ───────────────────────────────────────────────────

  private async processCoinGeckoGem(gem: TrendingCoinResult) {
    if (!gem.dexPair) return;
    const chain = gem.dexPair.chainId ?? 'solana';
    const safetyReport = await this.safetyScanner.scan(gem.dexPair.address, chain);
    const report = await this.researchEngine.generateReport({
      token: gem.dexPair,
      chain,
      theme: {
        theme: `CG Trending #${gem.coingeckoCoin.marketCapRank ?? '?'}`,
        description: `CoinGecko trending coin: ${gem.coingeckoCoin.name}`,
        keywords: [gem.coingeckoCoin.symbol],
        platforms: { twitter: 0, reddit: 0, telegram: 0 },
        sentiment: 0.5,
        momentum: 'rising' as const,
        catalyst: 'CoinGecko trending',
        tokensFound: [],
      },
      socialSignals: [],
      safetyReport,
    });

    if (report.thesis === 'BUY' && (report.thesisStrength ?? 0) > 70) {
      await this.sendCoinGeckoGemAlert(gem, report);
    }
  }

  private async processGeckoTerminalPool(pool: any) {
    if (!pool.token0Address) return;
    // Build a synthetic DexScreenerToken from pool data
    const token: DexScreenerToken = {
      address: pool.token0Address,
      chainId: pool.network,
      dexId: 'geckoterminal',
      name: pool.token0Symbol ?? '',
      symbol: pool.token0Symbol ?? '',
      marketCap: String(pool.liquidity * 2), // approximate
      liquidity: String(pool.liquidity),
      volume24h: String(pool.volume24h),
      priceUsd: String(pool.price),
      priceChange: { h24: '0' },
      pairAddress: pool.poolAddress,
    };

    const chain = pool.network;
    const safetyReport = await this.safetyScanner.scan(pool.token0Address, chain);
    const report = await this.researchEngine.generateReport({
      token,
      chain,
      theme: {
        theme: 'Fresh Liquidity',
        description: `New pool on GeckoTerminal: ${pool.token0Symbol}/${pool.token1Symbol}`,
        keywords: [pool.token0Symbol ?? ''],
        platforms: { twitter: 0, reddit: 0, telegram: 0 },
        sentiment: 0.5,
        momentum: 'rising' as const,
        catalyst: 'GeckoTerminal new pool',
        tokensFound: [],
      },
      socialSignals: [],
      safetyReport,
    });

    if (report.thesis === 'BUY' && (report.thesisStrength ?? 0) > 70) {
      await this.sendGeckoTerminalAlert(pool, report);
    }
  }

  private async processDEXToolsAnnouncement(ann: any) {
    // Build a synthetic token from announcement
    const token: DexScreenerToken = {
      address: ann.tokenAddress,
      chainId: ann.chain,
      dexId: 'dextools',
      name: ann.tokenName ?? ann.tokenSymbol ?? '',
      symbol: ann.tokenSymbol ?? '',
      marketCap: ann.estimatedMC ? String(ann.estimatedMC) : '0',
      liquidity: '0',
      volume24h: '0',
      priceUsd: ann.priceUSD ? String(ann.priceUSD) : '0',
      priceChange: { h24: '0' },
      pairAddress: ann.tokenAddress,
    };

    const chain = ann.chain;
    const safetyReport = await this.safetyScanner.scan(ann.tokenAddress, chain);
    const report = await this.researchEngine.generateReport({
      token,
      chain,
      theme: {
        theme: 'New Announcement',
        description: `DEXTools announced: ${ann.tokenName ?? ann.tokenSymbol}`,
        keywords: [ann.tokenSymbol ?? ''],
        platforms: { twitter: 0, reddit: 0, telegram: 0 },
        sentiment: 0.5,
        momentum: 'rising' as const,
        catalyst: 'DEXTools announcement',
        tokensFound: [],
      },
      socialSignals: [],
      safetyReport,
    });

    if (report.thesis === 'BUY' && (report.thesisStrength ?? 0) > 70) {
      await this.sendDEXToolsAlert(ann, report);
    }
  }

  private async processWhaleBuy(buy: WhaleTransfer) {
    if (!buy.tokenAddress) return;
    const token: DexScreenerToken = {
      address: buy.tokenAddress,
      chainId: buy.chain,
      dexId: 'unknown',
      name: buy.tokenSymbol ?? '',
      symbol: buy.tokenSymbol ?? '',
      marketCap: '0',
      liquidity: '0',
      volume24h: '0',
      priceUsd: '0',
      priceChange: { h24: '0' },
      pairAddress: '',
    };

    const safetyReport = await this.safetyScanner.scan(buy.tokenAddress, buy.chain);
    const report = await this.researchEngine.generateReport({
      token,
      chain: buy.chain,
      theme: {
        theme: `Whale Buy: ${buy.walletName}`,
        description: `${buy.walletName} bought ${buy.tokenSymbol} (${this.fmtUsd(String(buy.amountUsd))})`,
        keywords: [buy.tokenSymbol ?? ''],
        platforms: { twitter: 0, reddit: 0, telegram: 0 },
        sentiment: 0.8,
        momentum: 'rising' as const,
        catalyst: 'Whale buy',
        tokensFound: [],
      },
      socialSignals: [],
      safetyReport,
    });

    if (report.thesis === 'BUY' && (report.thesisStrength ?? 0) > 60) {
      await this.sendWhaleBuyAlert(buy, report);
    }
  }

  private async sendCoinGeckoGemAlert(gem: TrendingCoinResult, report: any) {
    const lines = [
      `🟡 *COINGECKO GEM SIGNAL — ${gem.coingeckoCoin.name} (${gem.coingeckoCoin.symbol})*`,
      '',
      `📈 CG Rank: #${gem.coingeckoCoin.marketCapRank ?? '?'} | Signal Strength: ${gem.signalStrength}/100`,
      `💰 DEX MC: $${this.fmtUsd(String(gem.dexPair?.marketCap))} | Upside Potential: ${gem.upsidePotential.toFixed(1)}x`,
      `🔗 Pair: https://dexscreener.com/${gem.dexPair?.chainId ?? 'solana'}/${gem.dexPair?.address}`,
      '',
      `💡 Thesis: ${report.thesisReasoning ?? 'CoinGecko trending with low DEX market cap — potential pre-pump gem.'}`,
      '',
      `⚠️ Risk: ${report.riskLevel ?? 'MEDIUM'} — do your own DD`,
    ].filter(Boolean);

    await this.telegramService.sendMessage(lines.join('\n'));
  }

  private async sendGeckoTerminalAlert(pool: any, report: any) {
    const lines = [
      `🟢 *GECKOTERMINAL GEM — Fresh Liquidity*`,
      '',
      `Pool: ${pool.token0Symbol}/${pool.token1Symbol}`,
      `💧 Liq: $${this.fmtUsd(String(pool.liquidity))} | 📈 Vol: $${this.fmtUsd(String(pool.volume24h))}/24h`,
      `🔗 https://dexscreener.com/${pool.network}/${pool.poolAddress}`,
      '',
      `💡 Thesis: ${report.thesisReasoning ?? 'New pool with fresh liquidity detected.'}`,
      '',
      `⚠️ Risk: ${report.riskLevel ?? 'MEDIUM'} — do your own DD`,
    ].filter(Boolean);

    await this.telegramService.sendMessage(lines.join('\n'));
  }

  private async sendDEXToolsAlert(ann: any, report: any) {
    const lines = [
      `🟠 *DEXTOOLS ANNOUNCEMENT — ${ann.tokenSymbol ?? ann.tokenName}*`,
      '',
      ann.estimatedMC ? `📊 Est. MC: $${this.fmtUsd(String(ann.estimatedMC))}` : '',
      ann.priceUSD ? `💰 Price: $${parseFloat(ann.priceUSD).toFixed(6)}` : '',
      ann.txHash ? `🔗 TX: https://dexscreener.com/${ann.chain}/${ann.txHash}` : '',
      '',
      `💡 Thesis: ${report.thesisReasoning ?? 'New token announced via DEXTools — dev is marketing.'}`,
      '',
      `⚠️ Risk: ${report.riskLevel ?? 'MEDIUM'} — do your own DD`,
    ].filter(Boolean);

    await this.telegramService.sendMessage(lines.join('\n'));
  }

  private async sendWhaleBuyAlert(buy: WhaleTransfer, report: any) {
    const lines = [
      `🐋 *WHALE SIGNAL — ${buy.walletName} bought ${buy.tokenSymbol}*`,
      '',
      `💰 Amount: $${this.fmtUsd(String(buy.amountUsd))} | Chain: ${buy.chain.toUpperCase()}`,
      buy.txHash ? `🔗 TX: https://dexscreener.com/${buy.chain}/${buy.txHash}` : '',
      '',
      `💡 Thesis: Smart money moving — ${buy.walletName} bought ${buy.tokenSymbol}. ${report.thesisReasoning ?? ''}`,
      '',
      `⚠️ Risk: ${report.riskLevel ?? 'MEDIUM'} — do your own DD`,
    ].filter(Boolean);

    await this.telegramService.sendMessage(lines.join('\n'));
  }

  // ─── Telegram Alert ───────────────────────────────────────────────────────

  private async sendResearchAlert(report: any, theme: any) {
    const emoji = report.chain === 'solana' ? '🔮' : report.chain === 'ethereum' ? '🟣' : '🌙';
    const scoreBar = '🟩'.repeat(Math.floor((report.thesisStrength ?? 0) / 20)) + '⬜'.repeat(5 - Math.floor((report.thesisStrength ?? 0) / 20));

    // Safety status lines
    const mintStatus = report.mintAuthority === true ? '✅ REVOKED' : report.mintAuthority === false ? '❌ ACTIVE' : '❓ Unknown';
    const lpStatus = report.lpBurningStatus === 'burned' ? '✅ BURNED' : report.lpBurningStatus === 'locked' ? '🔒 LOCKED' : report.lpBurningStatus === 'unlocked' ? '⚠️ UNLOCKED' : '❓ Unknown';
    const renouncedStatus = report.renounced === true ? '✅ YES' : report.renounced === false ? '❌ NO' : '❓ Unknown';

    // Social lines
    const twitterPosts = report.signalSource ? 'N/A (social signal)' : 'N/A';
    const redditPosts = report.signalSource ? 'N/A' : 'N/A';
    const sentimentStr = theme.sentiment > 0 ? `+${(theme.sentiment * 100).toFixed(0)}%` : `${(theme.sentiment * 100).toFixed(0)}%`;

    const lines = [
      `${emoji} *GEM SIGNAL — ${report.thesis} (Strength: ${report.thesisStrength ?? 0}/100)*`,
      '',
      `Theme: *${theme.theme ?? report.signalSource ?? 'General'}*`,
      theme.catalyst ? `Catalyst: ${theme.catalyst}` : '',
      '',
      `📋 *Contract Safety (RugScore: ${report.rugScore ?? 0}/100)*`,
      `✅ Mint authority: ${mintStatus}`,
      `✅ LP: ${lpStatus}`,
      `✅ Renounced: ${renouncedStatus}`,
      report.teamPrevTokens && (report.teamPrevTokens as any[])?.length > 0
        ? `⚠️ Creator has ${(report.teamPrevTokens as any[]).length} prev tokens`
        : '',
      '',
      `👥 *Social (${theme.momentum ?? 'unknown'} — momentum: ${theme.momentum?.toUpperCase() ?? 'N/A'})*`,
      `🐦 Keyword: ${report.signalSource ?? 'N/A'} | Sentiment: ${sentimentStr}`,
      `📊 Theme mentions: ${Object.values(theme.platforms ?? {}).reduce((a: number, b: any) => a + Number(b), 0)}`,
      '',
      `📊 *On-Chain*`,
      `DEX: ${report.dexId ?? 'unknown'} | Pair: ${report.chain.toUpperCase()}`,
      `💰 MC: $${this.fmtUsd(report.marketCap)} | 💧 Liq: $${this.fmtUsd(report.liquidity)} | 📈 Vol: $${this.fmtUsd(report.volume24h)}/24h`,
      report.priceChange24h ? `📉 24h: ${parseFloat(report.priceChange24h) > 0 ? '+' : ''}${parseFloat(report.priceChange24h).toFixed(1)}%` : '',
      `🏷️ Token: ${report.tokenName ?? '???'} (${report.tokenAddress?.substring(0, 8) ?? ''}...)`,
      '',
      `💡 *Thesis*`,
      report.thesisReasoning ?? 'No thesis generated.',
      '',
      `🔗 dexScreener | 🚨 Risk: ${report.riskLevel ?? 'MEDIUM'} — do your own DD`,
    ].filter(Boolean);

    await this.telegramService.sendMessage(lines.join('\n'));
  }

  private fmtUsd(val: string | null | undefined): string {
    if (!val) return '0';
    const n = parseFloat(val);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toFixed(0);
  }

  // ─── Manual Triggers ──────────────────────────────────────────────────────

  /** Manual trigger for gem scan */
  async triggerScan(chain: string = 'solana') {
    await this.socialFirstScan(chain);
    return { message: 'Social-first gem hunt scan triggered', chain };
  }

  /** Manually trigger research on a specific theme/keyword */
  async triggerThemeScan(keyword: string): Promise<{ message: string; reportsCount: number }> {
    const socialSignals = await this.socialScanner.searchTheme(keyword);
    const chain = 'solana';
    const tokens = await this.searchTokensByKeyword(keyword, chain);

    let count = 0;
    for (const token of tokens.slice(0, 10)) {
      const safetyReport = await this.safetyScanner.scan(token.address, chain);
      await this.researchEngine.generateReport({
        token,
        chain,
        theme: null,
        socialSignals,
        safetyReport,
      });
      count++;
    }

    return { message: `Theme scan complete for "${keyword}"`, reportsCount: count };
  }

  /** Get or generate research report for a specific token */
  async getResearchReport(chain: string, address: string) {
    // Check DB first
    const existing = await this.prisma.tokenResearchReport.findUnique({
      where: { tokenAddress_chain: { tokenAddress: address, chain } },
    });

    if (existing) return existing;

    // Generate on-demand
    const tokens = await this.searchTokensByKeyword(address, chain);
    const token = tokens.find((t) => t.address === address) ?? {
      address,
      chainId: chain,
      dexId: 'unknown',
      name: 'Unknown',
      symbol: '???',
      marketCap: '0',
      liquidity: '0',
      volume24h: '0',
      priceUsd: '0',
      priceChange: { h24: '0' },
    };

    const safetyReport = await this.safetyScanner.scan(address, chain);
    const socialSignals = await this.socialScanner.searchTheme(address);

    return this.researchEngine.generateReport({
      token,
      chain,
      theme: null,
      socialSignals,
      safetyReport,
    });
  }

  // ─── Legacy Compatibility ─────────────────────────────────────────────────

  /** @deprecated Use socialFirstScan instead */
  async runLegacyScan(chain: string = 'solana') {
    const [gems, trending] = await Promise.all([
      this.scanner.scanForGems(chain),
      this.scanner.getTrending(chain, 20),
    ]);

    const allTokens = [...gems, ...trending];
    let newGemsFound = 0;

    for (const token of allTokens) {
      const gemScore = this.scanner.calculateGemScore(token);

      const existing = await this.prisma.discoveredGem.findUnique({
        where: { baseTokenAddress: token.address },
      });
      if (existing) continue;

      const signalType = gemScore >= 70 ? 'hot' : gemScore >= 50 ? 'alert' : 'watch';

      await this.prisma.discoveredGem.create({
        data: {
          baseTokenAddress: token.address,
          quoteTokenAddress: token.quoteTokenAddress ?? '',
          dexId: token.dexId ?? 'unknown',
          chain,
          name: token.name ?? 'Unknown',
          symbol: token.symbol ?? '???',
          priceUsd: parseFloat(token.priceUsd ?? '0'),
          marketCapUsd: parseFloat(token.marketCap ?? '0'),
          fdvUsd: parseFloat(token.fdv ?? '0'),
          liquidityUsd: parseFloat(token.liquidity ?? '0'),
          volume24h: parseFloat(token.volume24h ?? '0'),
          priceChange24h: parseFloat(token.priceChange?.h24 ?? '0'),
          holderCount: parseInt(token.holderCount ?? '0', 10),
          gemScore,
          signalType,
          sourcesDetected: ['dexscreener'],
          status: 'discovered',
        },
      });
      newGemsFound++;
    }

    const config = await this.prisma.gemHuntConfig.findFirst({ where: { chain, isActive: true } });
    if (config?.notificationEnabled) {
      const hotGems = await this.prisma.discoveredGem.findMany({
        where: {
          chain,
          status: 'discovered',
          signalType: 'hot',
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
        orderBy: { gemScore: 'desc' },
        take: 3,
      });

      for (const gem of hotGems) {
        await this.sendLegacyGemAlert(gem);
        await this.prisma.discoveredGem.update({
          where: { id: gem.id },
          data: { status: 'watching' },
        });
      }
    }

    this.logger.log(`Legacy gem hunt scan complete: ${newGemsFound} new gems found on ${chain}`);
  }

  private async sendLegacyGemAlert(gem: any) {
    const emoji = gem.chain === 'solana' ? '🔮' : '🌙';
    const scoreBar = '🟩'.repeat(Math.floor(gem.gemScore / 20)) + '⬜'.repeat(5 - Math.floor(gem.gemScore / 20));

    const lines = [
      `${emoji} *GEM ALERT — ${gem.signalType.toUpperCase()}*`,
      '',
      `*${gem.name} (${gem.symbol})*`,
      `Chain: ${gem.chain.toUpperCase()} | DEX: ${gem.dexId}`,
      '',
      `💰 Price: $${gem.priceUsd?.toFixed(6) ?? '?'}`,
      `📊 Market Cap: $${((gem.marketCapUsd ?? 0) / 1000).toFixed(0)}K`,
      `💧 Liquidity: $${((gem.liquidityUsd ?? 0) / 1000).toFixed(0)}K`,
      `📈 24h Vol: $${((gem.volume24h ?? 0) / 1000).toFixed(0)}K`,
      `📉 24h Change: ${gem.priceChange24h?.toFixed(1) ?? '?'}%`,
      '',
      `🎯 Gem Score: ${scoreBar} ${gem.gemScore}/100`,
      gem.baseTokenAddress ? `🔗 https://dexscreener.com/${gem.chain}/${gem.baseTokenAddress}` : '',
    ].filter(Boolean);

    await this.telegramService.sendMessage(lines.join('\n'));
  }
}
