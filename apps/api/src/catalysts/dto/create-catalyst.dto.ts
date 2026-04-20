import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';
import { CatalystStatus, CatalystType } from '@crypto-edge/shared';

export class CreateCatalystDto {
  @ApiProperty()
  @IsString()
  assetId!: string;

  @ApiProperty({ enum: CatalystType })
  @IsEnum(CatalystType)
  type!: CatalystType;

  @ApiProperty({ example: 'Protocol upgrade announcement' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Detailed description of the catalyst event' })
  @IsString()
  description!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceName?: string;

  @ApiProperty()
  @IsDateString()
  effectiveAt!: string;

  @ApiProperty({ enum: CatalystStatus, default: CatalystStatus.UPCOMING })
  @IsOptional()
  @IsEnum(CatalystStatus)
  status?: CatalystStatus;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsInt()
  impactScore?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsInt()
  confidenceScore?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsInt()
  urgencyScore?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isManual?: boolean;
}
