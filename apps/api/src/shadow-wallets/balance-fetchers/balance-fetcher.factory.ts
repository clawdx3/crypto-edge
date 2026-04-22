import { IBalanceFetcher } from './balance-fetcher.interface';
import { SolanaBalanceFetcher } from './solana-balance-fetcher';
import { EvmBalanceFetcher } from './evm-balance-fetcher';

// Curated list of popular EVM tokens per chain so we can fetch balances
// without requiring token-discovery APIs.
const POPULAR_TOKENS: Record<string, Map<string, { symbol: string; decimals: number }>> = {};

const ethTokens = new Map<
  string,
  { symbol: string; decimals: number }
>([
  ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', { symbol: 'WETH', decimals: 18 }],
  ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', { symbol: 'USDC', decimals: 6 }],
  ['0xdAC17F958D2ee523a2206206994597C13D831ec7', { symbol: 'USDT', decimals: 6 }],
  ['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', { symbol: 'WBTC', decimals: 8 }],
  ['0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', { symbol: 'wstETH', decimals: 18 }],
  ['0x6B175474E89094C44Da98b954EedeAC495271d0F', { symbol: 'DAI', decimals: 18 }],
  ['0x514910771AF9Ca656af840dff83E8264EcF986CA', { symbol: 'LINK', decimals: 18 }],
  ['0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', { symbol: 'AAVE', decimals: 18 }],
  ['0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', { symbol: 'UNI', decimals: 18 }],
  ['0x4Fabb145d64652a948d72533023f6E7A623C7C53', { symbol: 'BUSD', decimals: 18 }],
]);
POPULAR_TOKENS['ethereum'] = ethTokens;

const baseTokens = new Map<
  string,
  { symbol: string; decimals: number }
>([
  ['0x4200000000000000000000000000000000000006', { symbol: 'WETH', decimals: 18 }],
  ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', { symbol: 'USDC', decimals: 6 }],
]);
POPULAR_TOKENS['base'] = baseTokens;

const bscTokens = new Map<
  string,
  { symbol: string; decimals: number }
>([
  ['0x2170Ed0880ac9A755fd29B2688956BD959F933F8', { symbol: 'ETH', decimals: 18 }],
  ['0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', { symbol: 'USDC', decimals: 18 }],
  ['0x55d398326f99059fF775485246999027B3197955', { symbol: 'USDT', decimals: 18 }],
]);
POPULAR_TOKENS['bsc'] = bscTokens;

// Default RPCs (public, rate-limited — intended for occasional shadow-wallet syncs)
const DEFAULT_RPCS: Record<string, string> = {
  solana: 'https://api.mainnet-beta.solana.com',
  ethereum: 'https://eth.publicnode.com',
  base: 'https://base.publicnode.com',
  arbitrum: 'https://arbitrum.publicnode.com',
  optimism: 'https://optimism.publicnode.com',
  polygon: 'https://polygon.publicnode.com',
  bsc: 'https://bsc.publicnode.com',
  avalanche: 'https://avalanche.publicnode.com',
};

/** Resolve fetcher for a given chain. */
export function getBalanceFetcher(chain: string): IBalanceFetcher {
  const normalized = chain.toLowerCase().trim();

  if (normalized === 'solana') {
    return new SolanaBalanceFetcher(DEFAULT_RPCS['solana']);
  }

  const rpc = DEFAULT_RPCS[normalized] ?? DEFAULT_RPCS['ethereum'];
  const tokens = POPULAR_TOKENS[normalized] ?? new Map<string, { symbol: string; decimals: number }>();
  return new EvmBalanceFetcher(chain, rpc, tokens);
}
