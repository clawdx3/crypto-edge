# Ingestion Layer Plan

## Goals
Wire real APIs into the ingestion service so the system actually produces signal.

## API Integrations

### 1. Market Source Adapter
- CoinGecko `/simple/price` — BTC, ETH prices + 24h change
- CoinGecko `/coins/{id}/market_chart` — 7d/30d trend scoring
- CoinGecko `/global` — market cap, BTC dominance
- DeFiLlama `/tvl` — total DeFi TVL, tvl change
- Binance futures `/premiumIndex` — ETH/BTC funding rates

### 2. Wallet Source Adapter
- Etherscan `/api` — ETH wallet transactions
- The Graph — subgraph queries for DeFi positions

### 3. Catalyst Source Adapter
- TokenUnlocks API — upcoming token unlock schedule
- CoinGecko `/coins/{id}/events` — events
- Manual CSV/list as fallback

## Cron Jobs (BullMQ)
- `sync-market-metrics` — every 15 min
- `sync-wallet-transactions` — every 15 min
- `sync-catalysts` — every 1 hour
- `calculate-regime` — every 15 min after market sync
