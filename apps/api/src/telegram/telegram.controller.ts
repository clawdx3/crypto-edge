import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TelegramStatusDto } from './dto/telegram-status.dto';
import { TelegramService } from './telegram.service';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('status')
  @ApiOperation({ summary: 'Inspect Telegram integration scaffold status' })
  @ApiOkResponse({ type: TelegramStatusDto })
  getStatus(): TelegramStatusDto {
    return this.telegramService.getStatus();
  }
}
