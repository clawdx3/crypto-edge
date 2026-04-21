import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShadowWalletResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  chain!: string;

  @ApiPropertyOptional()
  alias!: string | null;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  winRate!: number;

  @ApiProperty()
  avgRoi30d!: number;

  @ApiProperty()
  totalTrades!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
