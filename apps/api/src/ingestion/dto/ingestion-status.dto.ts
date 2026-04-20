import { ApiProperty } from '@nestjs/swagger';

export class IngestionStatusDto {
  @ApiProperty({ type: [String], example: ['market', 'catalysts', 'wallets'] })
  adapters!: string[];

  @ApiProperty({ example: 'Scaffold only. Background jobs are not wired yet.' })
  message!: string;
}
