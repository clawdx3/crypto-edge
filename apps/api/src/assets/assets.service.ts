import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetResponseDto } from './dto/asset-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationQueryDto): Promise<{ data: AssetResponseDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.asset.count(),
    ]);

    return {
      data: assets as AssetResponseDto[],
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<AssetResponseDto> {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with id ${id} not found`);
    }
    return asset as AssetResponseDto;
  }

  async create(dto: CreateAssetDto): Promise<AssetResponseDto> {
    const asset = await this.prisma.asset.create({
      data: {
        symbol: dto.symbol,
        name: dto.name,
        chain: dto.chain,
        contractAddress: dto.contractAddress,
        category: dto.category,
        isActive: dto.isActive ?? true,
      },
    });
    return asset as AssetResponseDto;
  }

  async update(id: string, dto: UpdateAssetDto): Promise<AssetResponseDto> {
    const asset = await this.prisma.asset.update({
      where: { id },
      data: dto,
    });
    return asset as AssetResponseDto;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.asset.delete({ where: { id } });
  }
}
