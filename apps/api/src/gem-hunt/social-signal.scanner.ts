import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

export interface SocialSignalResult {
  keyword: string;
  platform: string;
  postCount: number;
  sentiment: number;
  reach: number;
  trending: boolean;
  avgEngagement: number;
  samplePosts: Array<{ text: string; likes: number; rt: number; url: string }>;
}

export interface TrendingKeyword {
  keyword: string;
  postVelocity: number;   // posts per hour
  sentiment: number;       // -1 to 1
  reach: number;           // total impressions
  avgEngagement: number;
  trending: boolean;
}

interface ScraperSearchResponse {
  keyword: string;
  post_count: number;
  sentiment: number;
  reach: number;
  trending: boolean;
  avg_engagement: number;
  sample_posts: Array<{ text: string; likes: number; rt: number; impressions: number; url: string }>;
}

interface RedditScraperResponse {
  keyword: string;
  post_count: number;
  sentiment: number;
  reach: number;
  trending: boolean;
  avg_engagement: number;
  sample_posts: Array<{
    title: string;
    text: string;
    score: number;
    comments: number;
    url: string;
    subreddit: string;
    created_hours_ago: number;
  }>;
}

@Injectable()
export class SocialSignalScanner {
  private readonly logger = new Logger(SocialSignalScanner.name);
  private readonly scraperUrl: string;

  // Default crypto-themed keywords to scan
  private readonly defaultKeywords = [
    'solana meme coin',
    'AI agent token',
    'political coin',
    'dogecoin',
    'pepe coin',
    '基于AI',
    'ai16z',
    'lancelot',
    '勇',
    'FOMO',
    'gem found',
    'next 100x',
    'memecoin sniper',
    'new token launch',
  ];

  // Subreddits to monitor
  private readonly subreddits = [
    'CryptoMoonShots',
    'Solana',
    'memecoins',
    'CryptoCurrency',
    'SatoshiBets',
    'altcoin',
    'cryptomarkets',
    'DeFi',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.scraperUrl = this.configService.get<string>('GEM_HUNT_SCRAPER_URL') || 'http://localhost:3002';
    this.logger.log(`Using external scraper at: ${this.scraperUrl}`);
  }

  /**
   * Search Twitter for a keyword via Python scraper service.
   */
  async searchTwitter(keyword: string, maxResults = 20): Promise<SocialSignalResult> {
    const result: SocialSignalResult = {
      keyword,
      platform: 'twitter',
      postCount: 0,
      sentiment: 0,
      reach: 0,
      trending: false,
      avgEngagement: 0,
      samplePosts: [],
    };

    try {
      const { data } = await axios.get<ScraperSearchResponse>(
        `${this.scraperUrl}/search/${encodeURIComponent(keyword)}`,
        { params: { limit: maxResults }, timeout: 15_000 }
      );

      result.postCount = data.post_count;
      result.sentiment = data.sentiment;
      result.reach = data.reach;
      result.trending = data.trending;
      result.avgEngagement = data.avg_engagement;
      result.samplePosts = (data.sample_posts ?? []).map((p) => ({
        text: p.text,
        likes: p.likes,
        rt: p.rt,
        url: p.url,
      }));

      this.logger.debug(`Twitter search for "${keyword}": ${data.post_count} posts, sentiment: ${data.sentiment}`);
    } catch (err: any) {
      // Graceful degradation: log and return empty result if scraper unavailable
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        this.logger.warn(`Scraper service unavailable at ${this.scraperUrl}, returning empty result for "${keyword}"`);
      } else {
        this.logger.warn(`Twitter search failed for "${keyword}": ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Search Reddit for keyword mentions via Python scraper service.
   */
  async searchReddit(keyword: string, subreddit?: string): Promise<SocialSignalResult> {
    const result: SocialSignalResult = {
      keyword,
      platform: 'reddit',
      postCount: 0,
      sentiment: 0,
      reach: 0,
      trending: false,
      avgEngagement: 0,
      samplePosts: [],
    };

    try {
      const { data } = await axios.get<RedditScraperResponse>(
        `${this.scraperUrl}/search/reddit/${encodeURIComponent(keyword)}`,
        { timeout: 15_000 }
      );

      result.postCount = data.post_count;
      result.sentiment = data.sentiment;
      result.reach = data.reach;
      result.trending = data.trending;
      result.avgEngagement = data.avg_engagement;
      result.samplePosts = (data.sample_posts ?? []).map((p) => ({
        text: p.title,
        likes: p.score,
        rt: p.comments,
        url: p.url,
      }));

      this.logger.debug(`Reddit search for "${keyword}": ${data.post_count} posts, sentiment: ${data.sentiment}`);
    } catch (err: any) {
      // Graceful degradation: log and return empty result if scraper unavailable
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        this.logger.warn(`Scraper service unavailable at ${this.scraperUrl}, returning empty result for "${keyword}"`);
      } else {
        this.logger.warn(`Reddit search failed for "${keyword}": ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Search a theme across all platforms and store in DB.
   */
  async searchTheme(keyword: string): Promise<SocialSignalResult[]> {
    const [twitterResult, redditResult] = await Promise.allSettled([
      this.searchTwitter(keyword),
      this.searchReddit(keyword),
    ]);

    const results: SocialSignalResult[] = [];

    if (twitterResult.status === 'fulfilled') {
      results.push(twitterResult.value);
      await this.storeSignal(twitterResult.value);
    }

    if (redditResult.status === 'fulfilled') {
      results.push(redditResult.value);
      await this.storeSignal(redditResult.value);
    }

    return results;
  }

  /**
   * Scan default keywords across platforms.
   * Returns trending keywords sorted by velocity.
   */
  async scanAllKeywords(): Promise<TrendingKeyword[]> {
    const allSignals: TrendingKeyword[] = [];

    for (const keyword of this.defaultKeywords) {
      const signals = await this.searchTheme(keyword);

      for (const sig of signals) {
        if (sig.postCount > 0) {
          allSignals.push({
            keyword: sig.keyword,
            postVelocity: sig.postCount,
            sentiment: sig.sentiment,
            reach: sig.reach,
            avgEngagement: sig.avgEngagement,
            trending: sig.trending,
          });
        }
      }
    }

    // Sort by post velocity descending
    return allSignals.sort((a, b) => b.postVelocity - a.postVelocity);
  }

  /**
   * Scan trending topics on Reddit (r/popular, r/CryptoMoonShots hot).
   */
  async scanRedditTrending(): Promise<string[]> {
    const trending: string[] = [];
    try {
      const { data } = await axios.get(
        'https://www.reddit.com/r/CryptoMoonShots/hot.json?limit=20',
        { headers: { 'User-Agent': 'crypto-edge-v1/1.0' }, timeout: 10_000 },
      );

      const posts = data?.data?.children ?? [];
      for (const { data: post } of posts) {
        const title = post.title ?? '';
        if (title.length > 10) {
          // Extract potential keywords
          const words = title.split(/\s+/).filter((w: string) => w.length > 4);
          trending.push(...words.slice(0, 5));
        }
      }
    } catch (err: any) {
      this.logger.warn(`Reddit trending scan failed: ${err.message}`);
    }
    return Array.from(new Set(trending));
  }

  private async storeSignal(signal: SocialSignalResult): Promise<void> {
    try {
      // Try to find existing signal by keyword and platform
      const existing = await this.prisma.socialSignal.findFirst({
        where: { keyword: signal.keyword, platform: signal.platform },
      });

      if (existing) {
        // Update existing record
        await this.prisma.socialSignal.update({
          where: { id: existing.id },
          data: {
            postCount: signal.postCount,
            sentiment: signal.sentiment,
            reach: signal.reach,
            trending: signal.trending,
            avgEngagement: signal.avgEngagement,
            samplePosts: signal.samplePosts,
          },
        });
      } else {
        // Create new record
        await this.prisma.socialSignal.create({
          data: {
            keyword: signal.keyword,
            platform: signal.platform,
            postCount: signal.postCount,
            sentiment: signal.sentiment,
            reach: signal.reach,
            trending: signal.trending,
            avgEngagement: signal.avgEngagement,
            samplePosts: signal.samplePosts,
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to store social signal: ${err.message}`);
    }
  }
}
