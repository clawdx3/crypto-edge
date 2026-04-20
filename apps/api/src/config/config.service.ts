import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: NestConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('app.nodeEnv') ?? 'development';
  }

  get apiPort(): number {
    return this.configService.get<number>('app.port') ?? 3001;
  }

  get databaseUrl(): string {
    return (
      this.configService.get<string>('app.databaseUrl') ??
      'postgresql://postgres:password@localhost:5432/crypto_edge?schema=public'
    );
  }

  get redisHost(): string {
    return this.configService.get<string>('app.redisHost') ?? 'localhost';
  }

  get redisPort(): number {
    return this.configService.get<number>('app.redisPort') ?? 6379;
  }

  get telegramBotToken(): string | undefined {
    return this.configService.get<string>('app.telegramBotToken');
  }

  get telegramChatId(): string | undefined {
    return this.configService.get<string>('app.telegramChatId');
  }

  get coingeckoApiKey(): string | undefined {
    return this.configService.get<string>('app.coingeckoApiKey');
  }

  get corsOrigin(): string {
    return this.configService.get<string>('app.corsOrigin') ?? 'http://localhost:3000';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }
}
