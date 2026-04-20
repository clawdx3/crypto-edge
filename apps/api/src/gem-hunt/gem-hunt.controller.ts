import { Controller, Get, Post, Patch, Query, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GemHuntService } from './gem-hunt.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('gem-hunt')
@Controller('gem-hunt')
export class GemHuntController {
  constructor(
    private readonly gemHuntService: GemHuntService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('scan')
  @ApiOperation({ summary: 'Trigger a gem hunt scan manually' })
  async triggerScan(@Query('chain') chain: string = 'solana') {
    await this.gemHuntService.triggerScan(chain);
    return { message: 'Gem hunt scan triggered', chain };
  }

  @Get('gems')
  @ApiOperation({ summary: 'List discovered gems' })
  async getGems(
    @Query('status') status?: string,
    @Query('chain') chain?: string,
    @Query('minScore') minScore?: string,
  ) {
    return this.prisma.discoveredGem.findMany({
      where: {
        ...(status && { status }),
        ...(chain && { chain }),
        ...(minScore && { gemScore: { gte: parseFloat(minScore) } }),
      },
      orderBy: { gemScore: 'desc' },
      take: 50,
    });
  }

  @Patch('gems/:id')
  @ApiOperation({ summary: 'Update gem status (pass/trigger/skip)' })
  async updateGem(@Param('id') id: string, @Body('status') status: string) {
    return this.prisma.discoveredGem.update({
      where: { id },
      data: {
        status,
        triggeredAt: status === 'triggered' ? new Date() : undefined,
      },
    });
  }

  @Get('config')
  @ApiOperation({ summary: 'Get gem hunt config' })
  async getConfig() {
    return this.prisma.gemHuntConfig.findMany({ where: { isActive: true } });
  }

  @Post('config')
  @ApiOperation({ summary: 'Create or update gem hunt config' })
  async saveConfig(@Body() body: any) {
    const { id, ...data } = body;
    if (id) {
      return this.prisma.gemHuntConfig.update({ where: { id }, data });
    }
    return this.prisma.gemHuntConfig.create({ data });
  }
}
