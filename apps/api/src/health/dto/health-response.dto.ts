import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 'api' })
  service!: 'api';

  @ApiProperty({ example: '2026-04-20T05:00:00.000Z' })
  timestamp!: string;
}
