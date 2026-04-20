import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  databaseUrl: string;
  redisUrl: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

const getOptional = (value: string | undefined): string | undefined => {
  return value && value.length > 0 ? value : undefined;
};

export default registerAs('app', (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/crypto_edge?schema=public',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  telegramBotToken: getOptional(process.env.TELEGRAM_BOT_TOKEN),
  telegramChatId: getOptional(process.env.TELEGRAM_CHAT_ID),
}));
