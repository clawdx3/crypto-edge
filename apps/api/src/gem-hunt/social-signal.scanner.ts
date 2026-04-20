import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwitterApi } from 'twitter-api-v2';
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

@Injectable()
export class SocialSignalScanner {
  private readonly logger = new Logger(SocialSignalScanner.name);
  private twitterClient: TwitterApi | null = null;

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
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.initTwitterClient();
  }

  private initTwitterClient() {
    const bearerToken = this.configService.get<string>('TWITTER_BEARER_TOKEN');
    const apiKey = this.configService.get<string>('TWITTER_API_KEY');
    const apiSecret = this.configService.get<string>('TWITTER_API_SECRET');
    const accessToken = this.configService.get<string>('TWITTER_ACCESS_TOKEN');
    const accessSecret = this.configService.get<string>('TWITTER_ACCESS_SECRET');

    if (bearerToken) {
      // App-only or user context
      this.twitterClient = new TwitterApi(bearerToken);
      this.logger.log('Twitter client initialized (bearer token)');
    } else if (apiKey && apiSecret && accessToken && accessSecret) {
      this.twitterClient = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
      });
      this.logger.log('Twitter client initialized (user context)');
    } else {
      this.logger.warn(
        'Twitter credentials not configured. Set TWITTER_BEARER_TOKEN or TWITTER_API_KEY + related vars in .env',
      );
    }
  }

  /**
   * Search Twitter for a keyword and return signal data.
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

    if (!this.twitterClient) {
      this.logger.debug(`Twitter not configured, skipping search for: ${keyword}`);
      return result;
    }

    try {
      const rw = this.twitterClient.readOnly;
      const paginator = await rw.search(keyword, { max_results: Math.min(maxResults, 20) });
      const tweetsData = paginator.tweets ?? [];

      const posts: Array<{ text: string; likes: number; rt: number; url: string }> = [];
      let totalSentiment = 0;
      let totalEngagement = 0;

      for (const tweet of tweetsData) {
        result.postCount++;
        result.reach += Number(BigInt(tweet.public_metrics?.impression_count ?? 0));

        const likes = tweet.public_metrics?.like_count ?? 0;
        const rt = tweet.public_metrics?.retweet_count ?? 0;
        const engagement = likes + rt * 2;
        totalEngagement += engagement;

        // Simple sentiment: check for positive/negative keywords
        const text = (tweet.text ?? '').toLowerCase();
        const positiveWords = ['gem', 'moon', 'rocket', 'pump', 'win', 'buy', 'call', 'long', '100x', 'gain'];
        const negativeWords = ['scam', 'rug', 'dump', 'sell', 'avoid', 'rugpull', 'honeypot', 'shitcoin'];
        let s = 0;
        for (const w of positiveWords) if (text.includes(w)) s += 0.2;
        for (const w of negativeWords) if (text.includes(w)) s -= 0.2;
        totalSentiment += Math.max(-1, Math.min(1, s));

        posts.push({
          text: tweet.text?.substring(0, 280) ?? '',
          likes,
          rt,
          url: `https://twitter.com/i/web/status/${tweet.id}`,
        });
      }

      if (result.postCount > 0) {
        result.sentiment = totalSentiment / result.postCount;
        result.avgEngagement = totalEngagement / result.postCount;
        result.samplePosts = posts.slice(0, 5);
        // Trending if >10 posts in last batch or high avg engagement
        result.trending = result.postCount >= 10 || result.avgEngagement > 100;
      }
    } catch (err: any) {
      this.logger.warn(`Twitter search failed for "${keyword}": ${err.message}`);
    }

    return result;
  }

  /**
   * Search Reddit for keyword mentions.
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
      // Reddit free JSON API
      const targetSub = subreddit ?? 'CryptoMoonShots';
      const url = `https://www.reddit.com/r/${targetSub}/search.json?q=${encodeURIComponent(keyword)}&sort=hot&limit=20&restrict_sr=1`;

      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'crypto-edge-v1/1.0' },
        timeout: 10_000,
      });

      const posts = data?.data?.children ?? [];
      const postData: Array<{ text: string; likes: number; rt: number; url: string }> = [];
      let totalSentiment = 0;

      for (const { data: post } of posts) {
        result.postCount++;
        const score = post.score ?? 0;
        const numComments = post.num_comments ?? 0;
        result.reach += Number(score + numComments);
        result.avgEngagement += score + numComments;

        const text = (post.title ?? '').toLowerCase();
        const positiveWords = ['gem', 'moon', 'rocket', 'call', 'win', 'best', 'huge'];
        const negativeWords = ['scam', 'rug', 'dump', 'avoid', 'warning', 'rugpull'];
        let s = 0;
        for (const w of positiveWords) if (text.includes(w)) s += 0.2;
        for (const w of negativeWords) if (text.includes(w)) s -= 0.2;
        totalSentiment += Math.max(-1, Math.min(1, s));

        postData.push({
          text: post.title ?? '',
          likes: score,
          rt: numComments,
          url: `https://reddit.com${post.permalink}`,
        });
      }

      if (result.postCount > 0) {
        result.sentiment = totalSentiment / result.postCount;
        result.avgEngagement = result.avgEngagement / result.postCount;
        result.samplePosts = postData.slice(0, 5);
        result.trending = result.postCount >= 5 || result.avgEngagement > 50;
      }
    } catch (err: any) {
      this.logger.warn(`Reddit search failed for "${keyword}": ${err.message}`);
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
