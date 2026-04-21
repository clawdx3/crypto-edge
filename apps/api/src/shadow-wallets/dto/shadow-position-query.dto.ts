import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ShadowPositionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'ethereum' })
  @IsOptional()
  @IsString()
  chain?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;
}
