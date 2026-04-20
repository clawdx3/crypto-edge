import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { GemHuntScanner, DexScreenerToken } from './gem-hunt.scanner';
import { MemeCoinScanner } from './meme-coin.scanner';

@Injectable()
export class GemHuntService {
  private readonly logger = new Logger(GemHuntService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: GemHuntScanner,
    private readonly memeScanner: MemeCoinScanner,
    private readonly telegramService: TelegramService,
  ) {}

  /** Main scan job — runs every 5 minutes */
  @Cron('*/5 * * * *')
  async runGemScan() {
    this.logger.log('Running gem hunt scan...');

    const configs = await this.prisma.gemHuntConfig.findMany({ where: { isActive: true } });
    if (configs.length === 0) {
      // Create default config if none exist
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
      await this.scanChain(config.chain, config);
    }

    // Also scan meme coin trends across multiple chains
    await this.scanMemeCoins();
  }

  private async scanChain(chain: string, config: any) {
    const [gems, trending] = await Promise.all([
      this.scanner.scanForGems(chain),
      this.scanner.getTrending(chain, 20),
    ]);

    const allTokens = [...gems, ...trending];
    let newGemsFound = 0;

    for (const token of allTokens) {
      const gemScore = this.scanner.calculateGemScore(token);

      // Skip if already known
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

    // Send Telegram alert for HOT gems discovered in the last 5 minutes
    if (config.notificationEnabled) {
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
        await this.sendGemAlert(gem);
        await this.prisma.discoveredGem.update({
          where: { id: gem.id },
          data: { status: 'watching' },
        });
      }
    }

    this.logger.log(`Gem hunt scan complete: ${newGemsFound} new gems found on ${chain}`);
  }

  private async scanMemeCoins() {
    const memes = await this.memeScanner.scanTrendingMemeCoins();
    for (const token of memes) {
      const existing = await this.prisma.discoveredGem.findUnique({
        where: { baseTokenAddress: token.address },
      });
      if (existing) continue;

      const gemScore = this.scanner.calculateGemScore(token);
      const signalType = gemScore >= 70 ? 'hot' : gemScore >= 50 ? 'alert' : 'watch';

      await this.prisma.discoveredGem.create({
        data: {
          baseTokenAddress: token.address,
          quoteTokenAddress: token.quoteTokenAddress ?? '',
          dexId: token.dexId ?? 'unknown',
          chain: token.chain ?? 'solana',
          name: token.name ?? 'Unknown',
          symbol: token.symbol ?? '???',
          priceUsd: parseFloat(token.priceUsd ?? '0'),
          marketCapUsd: parseFloat(token.marketCap ?? '0'),
          fdvUsd: parseFloat(token.fdv ?? '0'),
          liquidityUsd: parseFloat(token.liquidity ?? '0'),
          volume24h: parseFloat(token.volume24h ?? '0'),
          priceChange24h: parseFloat(token.priceChange?.h24 ?? '0'),
          gemScore,
          signalType,
          sourcesDetected: ['dexscreener', 'meme-coin-scanner'],
          status: 'discovered',
        },
      });
    }
  }

  private async sendGemAlert(gem: any) {
    const emoji = gem.chain === 'solana' ? '🔮' : '🌙';
    const scoreBar =
      '🟩'.repeat(Math.floor(gem.gemScore / 20)) +
      '⬜'.repeat(5 - Math.floor(gem.gemScore / 20));

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
      gem.baseTokenAddress
        ? `🔗 https://dexscreener.com/${gem.chain}/${gem.baseTokenAddress}`
        : '',
    ].filter(Boolean);

    await this.telegramService.sendMessage(lines.join('\n'));
  }

  /** Manual trigger for gem scan */
  async triggerScan(chain: string = 'solana') {
    const config =
      (await this.prisma.gemHuntConfig.findFirst({ where: { chain, isActive: true } })) ?? {
        chain,
        notificationEnabled: false,
      };
    await this.scanChain(chain, config);
    await this.scanMemeCoins();
  }
}
