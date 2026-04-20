import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface MarketMetrics {
  btcPrice: number;
  ethPrice: number;
  btcTrend7d: number;   // -1 to 1
  ethTrend7d: number;   // -1 to 1
  btcDominance: number;
  totalMarketCap: number;
  stablecoinFlow: number; // -1 to 1 (approx from stablecoin cap delta)
  tvlDeFi: number;
  tvlChange24h: number;
  ethFunding: number;    // -1 to 1 normalized
  openInterestBtc: number;
  openInterestEth: number;
}

@Injectable()
export class MarketSourceAdapter {
  private readonly logger = new Logger(MarketSourceAdapter.name);
  private readonly coinGeckoBase = 'https://api.coingecko.com/api/v3';
  private readonly defillamaBase = 'https://api.llama.fi';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Fetch all market metrics needed for regime scoring.
   * Runs on a 15-minute interval.
   */
  async fetchMarketMetrics(): Promise<MarketMetrics> {
    const apiKey = this.configService.get<string>('COINGECKO_API_KEY');

    const [
      prices,
      btcChart,
      ethChart,
      global,
      defillamaTvl,
      ethFundingRaw,
    ] = await Promise.allSettled([
      this.fetchPrices(apiKey),
      this.fetchTrendFromChart('bitcoin', 7, apiKey),
      this.fetchTrendFromChart('ethereum', 7, apiKey),
      this.fetchGlobal(apiKey),
      this.fetchDeFiLlamaTVL(),
      this.fetchBinanceFunding('ETHUSDT'),
    ]);

    const btcTrend = btcChart.status === 'fulfilled' ? btcChart.value : 0;
    const ethTrend = ethChart.status === 'fulfilled' ? ethChart.value : 0;
    const funding = ethFundingRaw.status === 'fulfilled' ? ethFundingRaw.value : 0;

    return {
      btcPrice: prices.status === 'fulfilled' ? prices.value.btc : 0,
      ethPrice: prices.status === 'fulfilled' ? prices.value.eth : 0,
      btcTrend7d: btcTrend,
      ethTrend7d: ethTrend,
      btcDominance: global.status === 'fulfilled' ? global.value.btcDominance : 0,
      totalMarketCap: global.status === 'fulfilled' ? global.value.totalMarketCap : 0,
      stablecoinFlow: this.estimateStablecoinFlow(global),
      tvlDeFi: defillamaTvl.status === 'fulfilled' ? defillamaTvl.value.tvl : 0,
      tvlChange24h: defillamaTvl.status === 'fulfilled' ? defillamaTvl.value.change24h : 0,
      ethFunding: funding,
      openInterestBtc: 0, // requires premium data source
      openInterestEth: 0,
    };
  }

  private async fetchPrices(apiKey?: string): Promise<{ btc: number; eth: number }> {
    const url = `${this.coinGeckoBase}/simple/price`;
    const params: Record<string, string> = {
      ids: 'bitcoin,ethereum',
      vs_currencies: 'usd',
      include_24hr_change: 'true',
    };
    if (apiKey) params['x_cg_demo_api_key'] = apiKey;

    const { data } = await axios.get(url, { params });
    return {
      btc: data.bitcoin?.usd ?? 0,
      eth: data.ethereum?.usd ?? 0,
    };
  }

  private async fetchTrendFromChart(
    coinId: string,
    days: number,
    apiKey?: string,
  ): Promise<number> {
    try {
      const url = `${this.coinGeckoBase}/coins/${coinId}/market_chart`;
      const params: Record<string, string> = {
        vs_currency: 'usd',
        days: String(days),
        interval: 'daily',
      };
      if (apiKey) params['x_cg_demo_api_key'] = apiKey;

      const { data } = await axios.get(url, { params });
      const prices = data.prices as [number, number][];
      if (prices.length < 2) return 0;

      const oldest = prices[0]?.[1] ?? 0;
      const newest = prices[prices.length - 1]?.[1] ?? 0;
      const change = (newest - oldest) / oldest;
      // Normalize to -1 to 1 range (cap at ±50% as max)
      return Math.max(-1, Math.min(1, change / 0.5));
    } catch {
      return 0;
    }
  }

  private async fetchGlobal(apiKey?: string): Promise<{
    btcDominance: number;
    totalMarketCap: number;
    stablecoinMarketCap: number;
  }> {
    const url = `${this.coinGeckoBase}/global`;
    const params = apiKey ? { x_cg_demo_api_key: apiKey } : {};
    const { data } = await axios.get(url, { params });
    const d = data.data;
    return {
      btcDominance: d.market_cap_percentage?.btc ?? 0,
      totalMarketCap: d.total_market_cap?.usd ?? 0,
      stablecoinMarketCap: d.total_market_cap?.usd_stablecoin ?? 0,
    };
  }

  private async fetchDeFiLlamaTVL(): Promise<{
    tvl: number;
    change24h: number;
  }> {
    try {
      const { data } = await axios.get(`${this.defillamaBase}/tvl`);
      return {
        tvl: data.tvl ?? 0,
        change24h: data.change_24h ?? 0,
      };
    } catch {
      return { tvl: 0, change24h: 0 };
    }
  }

  private async fetchBinanceFunding(symbol: string): Promise<number> {
    try {
      // Binance USDM futures premium index (funding rate proxy)
      const { data } = await axios.get(
        `https://fapi.binance.com/fapi/v1/fundingRate`,
        { params: { symbol } },
      );
      const fundingRate = parseFloat(data.fundingRate ?? '0');
      // Normalize: -0.1% to +0.1% maps to -1 to 1
      return Math.max(-1, Math.min(1, fundingRate / 0.001));
    } catch {
      return 0;
    }
  }

  private estimateStablecoinFlow(
    global: PromiseSettledResult<{ btcDominance: number; totalMarketCap: number; stablecoinMarketCap: number }>,
  ): number {
    // Stablecoin flow is estimated as the change in stablecoin market cap share
    // Positive = capital flowing into stablecoins (risk-off signal)
    if (global.status !== 'fulfilled') return 0;
    const { totalMarketCap, stablecoinMarketCap } = global.value;
    if (!totalMarketCap) return 0;
    const stablecoinPct = stablecoinMarketCap / totalMarketCap;
    // > 5% stablecoin share = risk-off (negative flow), < 3% = risk-on
    if (stablecoinPct > 0.05) return -0.5;
    if (stablecoinPct < 0.03) return 0.5;
    return 0;
  }
}
