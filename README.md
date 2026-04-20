# Crypto Edge V1

A production-ready crypto decision-support system with real-time data aggregation, social signal analysis, and automated gem hunting.

## Architecture

The system consists of 5 services:

| Service | Port | Description |
|---------|------|-------------|
| **postgres** | 5432 | PostgreSQL 16 - Primary database |
| **redis** | 6379 | Redis 7 - Caching and job queues |
| **api** | 3001 | NestJS API - Business logic, Swagger docs at `/docs` |
| **web** | 3000 | Nuxt 3 Dashboard - User interface |
| **gem-hunt-scraper** | 3002 | Python FastAPI - Social media scraping for gem detection |

## Quick Start

```bash
# 1. Clone and navigate to project
cd crypto-edge-v1

# 2. Copy environment file
cp .env.docker .env

# 3. Start all services
docker compose up -d

# 4. View logs
docker compose logs -f
```

The application will be available at:
- **Web Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/docs

## Environment Variables

### Database
| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | crypto_edge | Database name |
| `POSTGRES_USER` | crypto_edge | Database user |
| `POSTGRES_PASSWORD` | crypto_edge_password | Database password |
| `POSTGRES_HOST` | postgres | Database host |
| `POSTGRES_PORT` | 5432 | Database port |
| `DATABASE_URL` | postgresql://... | Full connection string |

### Redis
| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | redis | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | (empty) | Redis password |

### API
| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | 3001 | API server port |
| `NODE_ENV` | production | Environment mode |

### Web/Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_PORT` | 3000 | Web server port |
| `NUXT_PUBLIC_API_BASE_URL` | http://localhost:3001/api | API base URL |

### Telegram (Optional)
| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | - | Telegram bot token |
| `TELEGRAM_CHAT_ID` | - | Telegram chat ID |

### External APIs (Optional)
| Variable | Default | Description |
|----------|---------|-------------|
| `COINGECKO_API_KEY` | - | CoinGecko API key |
| `ETHERSCAN_API_KEY` | - | Etherscan API key |

### Gem Hunt
| Variable | Default | Description |
|----------|---------|-------------|
| `GEM_HUNT_ENABLED` | true | Enable gem hunting |
| `GEM_HUNT_CHAIN` | solana | Target blockchain |
| `GEM_HUNT_SCRAPER_URL` | http://gem-hunt-scraper:3002 | Scraper service URL |

### Social Media Credentials (Optional - for gem-hunt-scraper)
| Variable | Description |
|----------|-------------|
| `TWITTER_USERNAME` | Twitter username |
| `TWITTER_PASSWORD` | Twitter password |
| `TWITTER_EMAIL` | Twitter email |
| `REDDIT_CLIENT_ID` | Reddit OAuth client ID |
| `REDDIT_CLIENT_SECRET` | Reddit OAuth client secret |
| `REDDIT_USERNAME` | Reddit username |
| `REDDIT_PASSWORD` | Reddit password |

## API Endpoints

### Health & Info
- `GET /` - Health check
- `GET /api` - API info

### Coins
- `GET /api/coins` - List tracked coins
- `GET /api/coins/:id` - Get coin details
- `POST /api/coins` - Track a new coin

### Markets
- `GET /api/markets` - Market data from CoinGecko
- `GET /api/markets/:id` - Single market data

### Watchlist
- `GET /api/watchlist` - User watchlist
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/:id` - Remove from watchlist

### Alerts
- `GET /api/alerts` - Price alerts
- `POST /api/alerts` - Create alert
- `PATCH /api/alerts/:id` - Update alert
- `DELETE /api/alerts/:id` - Delete alert

### Gem Hunt
- `GET /api/gem-hunt/status` - Gem hunt status
- `POST /api/gem-hunt/scan` - Trigger manual scan
- `GET /api/gem-hunt/gems` - List detected gems
- `POST /api/gem-hunt/analyze/:coinId` - Analyze specific coin

## Gem Hunter Flow

1. **Social Signal Collection**: The scraper collects signals from Twitter/X and Reddit
2. **Momentum Detection**: API analyzes social engagement, price momentum, and volume
3. **Gem Scoring**: Coins are scored based on social activity, price action, and fundamentals
4. **Alert Dispatch**: High-scoring gems trigger Telegram notifications
5. **Dashboard Display**: All gems and their scores visible in the web UI

### Supported Chains
- Solana (default)
- Ethereum (via Etherscan)

## Development

```bash
# Run migrations
docker compose run --rm migration

# View API logs
docker compose logs -f api

# View scraper logs
docker compose logs -f gem-hunt-scraper

# Rebuild after code changes
docker compose build
docker compose up -d
```

## License

Private - All rights reserved
