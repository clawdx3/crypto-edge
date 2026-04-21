import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { Position } from './entities/position.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PositionStatus } from '@crypto-edge/shared';

function toPosition(raw: any): Position {
  return { ...raw, status: raw.status as PositionStatus } as Position;
}

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationQueryDto): Promise<{ data: Position[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [positions, total] = await Promise.all([
      this.prisma.position.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { asset: true },
      }),
      this.prisma.position.count(),
    ]);

    return { data: positions.map(toPosition), total };
  }

  async findOne(id: string): Promise<Position> {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!position) {
      throw new NotFoundException(`Position with id ${id} not found`);
    }
    return toPosition(position);
  }

  async create(dto: CreatePositionDto): Promise<Position> {
    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + (dto.reviewFrequencyDays ?? 7) * 24 * 60 * 60 * 1000);

    const position = await this.prisma.position.create({
      data: {
        assetId: dto.assetId,
        status: dto.status ?? 'watchlist',
        thesis: dto.thesis,
        entryReason: dto.entryReason,
        invalidation: dto.invalidation,
        catalystWindowStart: dto.catalystWindowStart ? new Date(dto.catalystWindowStart) : null,
        catalystWindowEnd: dto.catalystWindowEnd ? new Date(dto.catalystWindowEnd) : null,
        maxSizePct: dto.maxSizePct ?? 10,
        entryPrice: dto.entryPrice,
        currentConviction: dto.currentConviction ?? 'medium',
        reviewFrequencyDays: dto.reviewFrequencyDays ?? 7,
        nextReviewAt,
        notes: dto.notes,
      },
    });
    return toPosition(position);
  }

  async update(id: string, dto: UpdatePositionDto): Promise<Position> {
    const position = await this.prisma.position.update({
      where: { id },
      data: {
        ...dto,
        catalystWindowStart: dto.catalystWindowStart ? new Date(dto.catalystWindowStart) : undefined,
        catalystWindowEnd: dto.catalystWindowEnd ? new Date(dto.catalystWindowEnd) : undefined,
        lastReviewedAt: dto.lastReviewedAt ? new Date(dto.lastReviewedAt) : undefined,
        nextReviewAt: dto.nextReviewAt ? new Date(dto.nextReviewAt) : undefined,
      },
    });
    return toPosition(position);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.position.delete({ where: { id } });
  }

  async archive(id: string): Promise<{ message: string }> {
    const position = await this.findOne(id);
    await this.prisma.position.update({
      where: { id },
      data: { status: 'closed' },
    });
    return { message: `Position ${position.id} archived` };
  }

  async review(id: string): Promise<{ message: string }> {
    const position = await this.findOne(id);
    const nextReviewAt = new Date(Date.now() + position.reviewFrequencyDays * 24 * 60 * 60 * 1000);
    await this.prisma.position.update({
      where: { id },
      data: {
        lastReviewedAt: new Date(),
        nextReviewAt,
      },
    });
    return { message: `Position ${position.id} reviewed, next review scheduled` };
  }
}
