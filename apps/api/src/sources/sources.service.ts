import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { Source } from './entities/source.entity';
import { SourceKind } from '@crypto-edge/shared';

function toSource(raw: any): Source {
  return { ...raw, kind: raw.kind as SourceKind } as Source;
}

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Source[]> {
    const sources = await this.prisma.source.findMany({ orderBy: { name: 'asc' } });
    return sources.map(toSource);
  }

  async findOne(id: string): Promise<Source> {
    const source = await this.prisma.source.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`Source with id ${id} not found`);
    }
    return toSource(source);
  }

  async create(dto: CreateSourceDto): Promise<Source> {
    const source = await this.prisma.source.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        baseUrl: dto.baseUrl,
        isEnabled: dto.isEnabled ?? true,
        rateLimitPerMin: dto.rateLimitPerMin ?? 60,
      },
    });
    return toSource(source);
  }

  async update(id: string, dto: UpdateSourceDto): Promise<Source> {
    const source = await this.prisma.source.update({
      where: { id },
      data: dto,
    });
    return toSource(source);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.source.delete({ where: { id } });
  }
}
