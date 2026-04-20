import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TelegramStatus {
  configured: boolean;
  message: string;
}

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly configService: ConfigService) {}

  getStatus(): TelegramStatus {
    const botToken = this.configService.get<string>('app.telegramBotToken');
    const chatId = this.configService.get<string>('app.telegramChatId');
    const configured = Boolean(botToken && chatId);

    return {
      configured,
      message: configured
        ? 'Telegram credentials detected. Delivery wiring is ready for implementation.'
        : 'Telegram delivery is scaffolded but inactive until credentials are provided.',
    };
  }

  async sendMessage(text: string): Promise<{ success: boolean; message: string }> {
    const botToken = this.configService.get<string>('app.telegramBotToken');
    const chatId = this.configService.get<string>('app.telegramChatId');

    if (!botToken || !chatId) {
      this.logger.warn('Telegram send attempted without credentials');
      return { success: false, message: 'Telegram not configured' };
    }

    // Scaffold: actual telegraf/telegram API integration deferred
    this.logger.log(`[TELEGRAM] Would send to ${chatId}: ${text.substring(0, 100)}...`);
    return { success: true, message: 'Message queued (scaffold)' };
  }
}
