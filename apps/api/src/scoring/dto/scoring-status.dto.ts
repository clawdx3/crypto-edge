import { ApiProperty } from '@nestjs/swagger';

export class ScoringStatusDto {
  @ApiProperty({ example: '0.1.0-foundation' })
  version!: string;

  @ApiProperty({ type: [String], example: ['regime', 'catalysts', 'wallets', 'positions'] })
  domains!: string[];
}
