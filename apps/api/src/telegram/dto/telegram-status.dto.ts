import { ApiProperty } from '@nestjs/swagger';

export class TelegramStatusDto {
  @ApiProperty({ example: false })
  configured!: boolean;

  @ApiProperty({ example: 'Telegram delivery is scaffolded but inactive until credentials are provided.' })
  message!: string;
}
