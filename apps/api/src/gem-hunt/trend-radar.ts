import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';
import { PrismaService } from '../prisma/prisma.service';

export interface TrendingThemeResult {
  theme: string;
  description: string | null;
  keywords: string[];
  platforms: { twitter: number; reddit: number; telegram: number };
  sentiment: number;
  momentum: 'rising' | 'peak' | 'fading';
  catalyst: string | null;
  tokensFound: Array<{ address: string; name: string; chain: string }>;
}

interface CatalystCheck {
  keyword: string;
  catalyst: string;
  confidence: number;
}

@Injectable()
export class TrendRadar {
  private readonly logger = new Logger(TrendRadar.name);
  private twitterClient: TwitterApi | null = null;

  // Predefined catalyst keywords to watch
  private readonly catalystKeywords = [
    'elon musk',
    'trump',
    'bitcoin ETF',
    'solana ETF',
    'coinbase',
    'binance',
    'paypal',
    'blackrock',
    'fidelity',
    'sec',
    'defi',
    'restaking',
    'eigenlayer',
    'liquid staking',
    'restake',
    'ai agent',
    'ai16z',
    'virtuals protocol',
    'ai fund',
    'autonomous',
    'GMI',
    'OG',
    'lander',
    'VVA',
    'arxiv',
    'openai',
    'anthropic',
  ];

  // Theme definitions with their search keywords
  private readonly themeDefinitions: Array<{
    theme: string;
    description: string;
    keywords: string[];
    catalystTriggers: string[];
  }> = [
    {
      theme: 'AI Agent Memecoins',
      description: 'Memecoins themed around AI agents and autonomous AI protocols',
      keywords: ['ai agent', 'AI16z', 'virtuals protocol', 'autonomous', 'AI agent token', 'GMI', 'OG', 'VVA', 'lander'],
      catalystTriggers: ['ai16z', 'virtuals', 'AI agent'],
    },
    {
      theme: 'Political Meme Coins',
      description: 'Meme coins tied to political figures or events',
      keywords: ['trump coin', 'maga coin', 'political token', 'donald', 'politi', 'pelosis', 'biden'],
      catalystTriggers: ['trump', 'maga', 'political'],
    },
    {
      theme: 'DePIN / Infrastructure',
      description: 'Decentralized physical infrastructure network tokens',
      keywords: ['DePIN', 'render', 'filecoin', 'arweave', 'storj', 'livepeer', 'depin', 'hotspot', 'HNT'],
      catalystTriggers: ['DePIN', 'render', 'filecoin'],
    },
    {
      theme: 'Solana Meme Coins',
      description: 'Trending meme coins on Solana chain',
      keywords: ['solana meme', 'dogwifcoin', 'wif', 'bonk', 'sol memecoin', 'dogecoin solana', 'popcat'],
      catalystTriggers: ['elon', 'solana'],
    },
    {
      theme: 'Ethereum Layer 2',
      description: 'Ethereum L2 ecosystem tokens',
      keywords: ['arbitrum', 'optimism', 'base', 'zksync', 'linea', 'scroll', 'polygon zkEVM', 'l2'],
      catalystTriggers: ['arbitrum', 'optimism', 'base', 'coinbase'],
    },
    {
      theme: 'Restaking / EigenLayer',
      description: 'EigenLayer restaking ecosystem',
      keywords: ['eigenlayer', 'restaking', 'eigen', 'restake', 'liquid restaking', 'symbiotic', 'renzo'],
      catalystTriggers: ['eigenlayer', 'restaking', 'defi'],
    },
    {
      theme: 'RWA / Real World Assets',
      description: 'Real world asset tokenization',
      keywords: ['RWA', 'real world assets', 'blackrock', 'tokenized', 'onboarding', '贝莱德'],
      catalystTriggers: ['blackrock', 'rwa', 'fidelity'],
    },
    {
      theme: 'Meme Coin Szn',
      description: 'General meme coin season / viral tokens',
      keywords: ['memecoin', 'pepe', 'dogecoin', 'shiba', 'moon', 'gem', '100x', 'snipe', 'meme season'],
      catalystTriggers: ['elon', 'bitcoin ETF'],
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initTwitterClient();
  }

  private initTwitterClient() {
    const bearerToken = this.configService.get<string>('TWITTER_BEARER_TOKEN');
    if (bearerToken) {
      this.twitterClient = new TwitterApi(bearerToken);
    }
  }

  /**
   * Main scan — detect all trending themes.
   * Returns themes sorted by momentum (rising first).
   */
  async scan(): Promise<TrendingThemeResult[]> {
    this.logger.log('TrendRadar: scanning for trending themes...');

    // 1. Check catalysts (Elon tweets, news, etc.)
    const catalystSignals = await this.checkCatalysts();

    // 2. Cross-reference with known theme definitions
    const themeResults = await this.analyzeThemes(catalystSignals);

    // 3. Store themes in DB
    for (const theme of themeResults) {
      await this.storeTheme(theme);
    }

    this.logger.log(`TrendRadar: detected ${themeResults.length} themes`);
    return themeResults;
  }

  /**
   * Detect real-world catalysts that could trigger token movements.
   */
  async checkCatalysts(): Promise<CatalystCheck[]> {
    const signals: CatalystCheck[] = [];

    // 1. Elon Musk Twitter mentions related to crypto
    if (this.twitterClient) {
      try {
        const elonTweets = await this.twitterClient.readOnly.search('from:elonmusk crypto', { max_results: 5 });
        for (const tweet of elonTweets) {
          const text = (tweet.text ?? '').toLowerCase();
          if (text.includes('doge') || text.includes('dogecoin')) {
            signals.push({ keyword: 'dogecoin', catalyst: 'Elon Musk tweet', confidence: 0.9 });
          }
          if (text.includes('solana') || text.includes('sol')) {
            signals.push({ keyword: 'solana', catalyst: 'Elon Musk tweet', confidence: 0.8 });
          }
          if (text.includes('AI') || text.includes('ai agent')) {
            signals.push({ keyword: 'AI agent', catalyst: 'Elon Musk tweet', confidence: 0.85 });
          }
        }
      } catch {
        // Silently fail — twitter search may not work without proper credentials
      }
    }

    // 2. Check Reddit worldnews / news for crypto-relevant catalysts
    try {
      const { data } = await axios.get(
        'https://www.reddit.com/r/worldnews/hot.json?limit=10',
        { headers: { 'User-Agent': 'crypto-edge-v1/1.0' }, timeout: 10_000 },
      );
      const posts = data?.data?.children ?? [];
      for (const { data: post } of posts) {
        const title = (post.title ?? '').toLowerCase();
        if (title.includes('bitcoin') || title.includes('ethereum') || title.includes('crypto')) {
          signals.push({ keyword: 'crypto general', catalyst: 'News article', confidence: 0.6 });
        }
      }
    } catch {
      // Ignore
    }

    // 3. Search for specific catalyst keywords on Reddit
    for (const cat of this.catalystKeywords) {
      try {
        const { data } = await axios.get(
          `https://www.reddit.com/r/CryptoMoonShots/search.json?q=${encodeURIComponent(cat)}&sort=hot&limit=5&restrict_sr=1`,
          { headers: { 'User-Agent': 'crypto-edge-v1/1.0' }, timeout: 10_000 },
        );
        const count = data?.data?.children?.length ?? 0;
        if (count >= 3) {
          signals.push({ keyword: cat, catalyst: 'Reddit buzz', confidence: 0.5 + count * 0.05 });
        }
      } catch {
        // Ignore
      }
    }

    return signals;
  }

  /**
   * Analyze each theme definition and determine momentum.
   */
  private async analyzeThemes(catalystSignals: CatalystCheck[]): Promise<TrendingThemeResult[]> {
    const results: TrendingThemeResult[] = [];

    for (const def of this.themeDefinitions) {
      // Count how many keywords from this theme are currently buzzing
      let twitterMentions = 0;
      let redditMentions = 0;
      const matchedCatalysts: string[] = [];

      // Check catalyst signals for theme matches
      for (const cat of catalystSignals) {
        const matchedKeyword = def.catalystTriggers.find((k) =>
          cat.keyword.toLowerCase().includes(k.toLowerCase()),
        );
        if (matchedKeyword) {
          matchedCatalysts.push(cat.catalyst);
        }
      }

      // Check recent social signals in DB
      const recentSignals = await this.prisma.socialSignal.findMany({
        where: {
          keyword: { in: def.keywords },
          lastScrapedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // last 30 min
        },
        orderBy: { lastScrapedAt: 'desc' },
        take: 20,
      });

      for (const sig of recentSignals) {
        if (sig.platform === 'twitter') twitterMentions += sig.postCount;
        if (sig.platform === 'reddit') redditMentions += sig.postCount;
      }

      const totalMentions = twitterMentions + redditMentions;
      const sentiment = recentSignals.length > 0
        ? recentSignals.reduce((s, sig) => s + sig.sentiment, 0) / recentSignals.length
        : 0;

      // Determine momentum
      let momentum: 'rising' | 'peak' | 'fading' = 'fading';
      if (totalMentions > 30 || matchedCatalysts.length > 0) {
        momentum = 'peak';
      } else if (totalMentions > 10 || matchedCatalysts.length >= 1) {
        momentum = 'rising';
      }

      // Only include if there's meaningful activity
      if (totalMentions > 0 || matchedCatalysts.length > 0) {
        const catalyst = matchedCatalysts.length > 0
          ? [...new Set(matchedCatalysts)].join(', ')
          : matchedCatalysts[0] ?? null;

        results.push({
          theme: def.theme,
          description: def.description,
          keywords: def.keywords,
          platforms: {
            twitter: twitterMentions,
            reddit: redditMentions,
            telegram: 0,
          },
          sentiment,
          momentum,
          catalyst,
          tokensFound: [],
        });
      }
    }

    // Sort by momentum: rising > peak > fading, then by total mentions
    const momentumOrder = { rising: 0, peak: 1, fading: 2 };
    return results.sort((a, b) => {
      const mo = momentumOrder[a.momentum] - momentumOrder[b.momentum];
      if (mo !== 0) return mo;
      const aTotal = a.platforms.twitter + a.platforms.reddit;
      const bTotal = b.platforms.twitter + b.platforms.reddit;
      return bTotal - aTotal;
    });
  }

  /**
   * Store detected theme in DB.
   */
  private async storeTheme(theme: TrendingThemeResult): Promise<void> {
    try {
      // Find existing theme by name (note: no unique constraint on theme field)
      const existing = await this.prisma.trendingTheme.findFirst({
        where: { theme: theme.theme },
        orderBy: { detectedAt: 'desc' },
      });

      if (existing) {
        await this.prisma.trendingTheme.update({
          where: { id: existing.id },
          data: {
            keywords: theme.keywords,
            platforms: theme.platforms,
            sentiment: theme.sentiment,
            momentum: theme.momentum,
            catalyst: theme.catalyst,
            tokensFound: theme.tokensFound,
          },
        });
      } else {
        await this.prisma.trendingTheme.create({
          data: {
            theme: theme.theme,
            description: theme.description,
            keywords: theme.keywords,
            platforms: theme.platforms,
            sentiment: theme.sentiment,
            momentum: theme.momentum,
            catalyst: theme.catalyst,
            tokensFound: theme.tokensFound,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to store theme "${theme.theme}": ${err.message}`);
    }
  }
}
