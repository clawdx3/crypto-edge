export interface EnvironmentConfig {
  NODE_ENV: string;
  API_PORT: number;
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  COINGECKO_API_KEY?: string;
  CORS_ORIGIN: string;
}

export default (): EnvironmentConfig => ({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  API_PORT: Number(process.env.PORT ?? process.env.API_PORT ?? 3001),
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:password@localhost:5432/crypto_edge?schema=public',
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: Number(process.env.REDIS_PORT ?? 6379),
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
  COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
});
