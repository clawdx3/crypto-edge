import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { Source } from './entities/source.entity';

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Source[]> {
    return this.prisma.source.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<Source> {
    const source = await this.prisma.source.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`Source with id ${id} not found`);
    }
    return source;
  }

  async create(dto: CreateSourceDto): Promise<Source> {
    return this.prisma.source.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        baseUrl: dto.baseUrl,
        isEnabled: dto.isEnabled ?? true,
        rateLimitPerMin: dto.rateLimitPerMin ?? 60,
      },
    });
  }

  async update(id: string, dto: UpdateSourceDto): Promise<Source> {
    const source = await this.prisma.source.update({
      where: { id },
      data: dto,
    });
    return source;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.source.delete({ where: { id } });
  }
}
