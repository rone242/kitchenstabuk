import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { Prisma } from 'database';
import { Public } from '../auth/auth.decorators.js';
import { PrismaService } from '../database/prisma.service.js';
import { ServiceQueryDto } from './dto/service.dto.js';
import { paginationMeta } from '../common/dto/pagination.dto.js';

class DiscoveryQuery extends ServiceQueryDto {
  @IsOptional() @IsUUID() cityId?: string;
}

const visible: Prisma.ServiceWhereInput = {
  isActive: true,
  deletedAt: null,
  category: { isActive: true, deletedAt: null },
};
const serviceSelect = {
  id: true,
  slug: true,
  nameAr: true,
  summary: true,
  description: true,
  benefits: true,
  processSteps: true,
  priceType: true,
  startingPrice: true,
  maximumPrice: true,
  currency: true,
  durationText: true,
  category: { select: { id: true, nameAr: true } },
} satisfies Prisma.ServiceSelect;

@Public()
@Controller('catalogue')
export class PublicCatalogueController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('options')
  async options() {
    const [categories, cities] = await Promise.all([
      this.prisma.client.category.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, nameAr: true },
      }),
      this.prisma.client.city.findMany({
        where: {
          isActive: true,
          region: { isActive: true, country: { isActive: true } },
        },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, nameAr: true },
      }),
    ]);
    return { categories, cities };
  }

  @Get('services')
  async services(@Query() query: DiscoveryQuery) {
    const where: Prisma.ServiceWhereInput = {
      ...visible,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? { nameAr: { contains: query.search, mode: 'insensitive' } }
        : {}),
      ...(query.cityId
        ? {
            locations: {
              some: {
                cityId: query.cityId,
                isActive: true,
                city: {
                  isActive: true,
                  region: { isActive: true, country: { isActive: true } },
                },
                OR: [{ districtId: null }, { district: { isActive: true } }],
              },
            },
          }
        : {}),
    };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.service.findMany({
        where,
        select: serviceSelect,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.service.count({ where }),
    ]);
    return { data, meta: paginationMeta(query.page, query.pageSize, total) };
  }

  @Get('services/:slug')
  async service(@Param('slug') slug: string) {
    const result = await this.prisma.client.service.findFirst({
      where: { ...visible, slug },
      select: serviceSelect,
    });
    if (!result) throw new NotFoundException('Service not found');
    return result;
  }
}
