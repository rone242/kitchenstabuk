import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { Prisma } from 'database';
import { Public } from '../auth/auth.decorators.js';
import { PrismaService } from '../database/prisma.service.js';
import { ServiceQueryDto } from './dto/service.dto.js';
import { paginationMeta } from '../common/dto/pagination.dto.js';

class LocaleQuery {
  @IsOptional() @IsIn(['ar', 'en']) locale: 'ar' | 'en' = 'ar';
}

class DiscoveryQuery extends ServiceQueryDto {
  @IsOptional() @IsIn(['ar', 'en']) locale: 'ar' | 'en' = 'ar';
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
  nameEn: true,
  summaryEn: true,
  descriptionEn: true,
  benefitsEn: true,
  processStepsEn: true,
  durationTextEn: true,
  seoTitle: true,
  seoTitleEn: true,
  seoDescription: true,
  seoDescriptionEn: true,
  summary: true,
  description: true,
  benefits: true,
  processSteps: true,
  priceType: true,
  startingPrice: true,
  maximumPrice: true,
  currency: true,
  durationText: true,
  coverImage: {
    select: {
      publicUrl: true,
      altTextAr: true,
      altTextEn: true,
      width: true,
      height: true,
    },
  },
  gallery: {
    orderBy: { sortOrder: 'asc' },
    select: {
      media: {
        select: {
          publicUrl: true,
          altTextAr: true,
          altTextEn: true,
          width: true,
          height: true,
        },
      },
    },
  },
  category: { select: { id: true, nameAr: true, nameEn: true } },
} satisfies Prisma.ServiceSelect;

@Public()
@Controller('catalogue')
export class PublicCatalogueController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('branding')
  async branding() {
    const setting = await this.prisma.client.siteSetting.findUnique({
      where: { key: 'site.logoMediaId' },
      select: { value: true },
    });
    if (!setting?.value) return { logo: null };
    const logo = await this.prisma.client.mediaAsset.findUnique({
      where: { id: setting.value },
      select: {
        publicUrl: true,
        altTextAr: true,
        altTextEn: true,
        width: true,
        height: true,
      },
    });
    return { logo };
  }

  @Get('homepage')
  async homepage(@Query() query: LocaleQuery) {
    const [portfolio, reviews, settings] = await Promise.all([
      this.prisma.client.portfolioItem.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { completedAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          titleAr: true,
          description: true,
          completedAt: true,
          image: {
            select: {
              publicUrl: true,
              altTextAr: true,
              altTextEn: true,
              width: true,
              height: true,
            },
          },
          beforeImage: {
            select: {
              publicUrl: true,
              altTextAr: true,
              altTextEn: true,
              width: true,
              height: true,
            },
          },
          service: { select: { nameAr: true, nameEn: true } },
          city: { select: { nameAr: true, nameEn: true } },
        },
      }),
      this.prisma.client.customerReview.findMany({
        where: { isActive: true, status: 'APPROVED' },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          customerName: true,
          cityName: true,
          rating: true,
          body: true,
        },
      }),
      this.prisma.client.siteSetting.findMany({
        where: {
          isPublic: true,
          key: {
            in: ['contact.phone', 'contact.whatsapp', 'contact.workingHours'],
          },
        },
        select: { key: true, value: true },
      }),
    ]);
    return {
      portfolio: portfolio.map((item) => ({
        ...item,
        serviceName: displayName(item.service, query.locale),
        cityName: item.city ? displayName(item.city, query.locale) : null,
      })),
      reviews,
      settings: Object.fromEntries(
        settings.map((item) => [item.key, item.value]),
      ),
    };
  }

  @Get('projects/:id')
  async project(@Param('id') id: string, @Query() query: LocaleQuery) {
    const project = await this.prisma.client.portfolioItem.findFirst({
      where: { id, isPublished: true },
      include: { service: true, city: true, image: true, beforeImage: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return {
      ...project,
      serviceName: displayName(project.service, query.locale),
      cityName: project.city ? displayName(project.city, query.locale) : null,
    };
  }

  @Get('options')
  async options(@Query() query: LocaleQuery) {
    const [categories, cities] = await Promise.all([
      this.prisma.client.category.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, nameAr: true, nameEn: true },
      }),
      this.prisma.client.city.findMany({
        where: {
          isActive: true,
          region: { isActive: true, country: { isActive: true } },
        },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, nameAr: true, nameEn: true },
      }),
    ]);
    return {
      categories: categories.map((item) => ({
        ...item,
        name: displayName(item, query.locale),
      })),
      cities: cities.map((item) => ({
        ...item,
        name: displayName(item, query.locale),
      })),
    };
  }

  @Get('services')
  async services(@Query() query: DiscoveryQuery) {
    const where: Prisma.ServiceWhereInput = {
      ...visible,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { nameAr: { contains: query.search, mode: 'insensitive' } },
              { nameEn: { contains: query.search, mode: 'insensitive' } },
            ],
          }
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
    return {
      data: data.map((item) => localizeService(item, query.locale)),
      meta: paginationMeta(query.page, query.pageSize, total),
    };
  }

  @Get('services/:slug')
  async service(@Param('slug') slug: string, @Query() query: LocaleQuery) {
    const result = await this.prisma.client.service.findFirst({
      where: { ...visible, slug },
      select: serviceSelect,
    });
    if (!result) throw new NotFoundException('Service not found');
    return localizeService(result, query.locale);
  }
}

function displayName(
  item: { nameAr: string; nameEn: string | null },
  locale: string,
) {
  return locale === 'en' && item.nameEn?.trim() ? item.nameEn : item.nameAr;
}
export function localizeService(
  item: Prisma.ServiceGetPayload<{ select: typeof serviceSelect }>,
  locale: string,
) {
  const english = locale === 'en';
  return {
    ...item,
    name: displayName(item, locale),
    category: { ...item.category, name: displayName(item.category, locale) },
    summary: english && item.summaryEn?.trim() ? item.summaryEn : item.summary,
    description:
      english && item.descriptionEn?.trim()
        ? item.descriptionEn
        : item.description,
    benefits:
      english && item.benefitsEn.length ? item.benefitsEn : item.benefits,
    processSteps:
      english && item.processStepsEn.length
        ? item.processStepsEn
        : item.processSteps,
    durationText:
      english && item.durationTextEn?.trim()
        ? item.durationTextEn
        : item.durationText,
    seoTitle:
      english && item.seoTitleEn?.trim() ? item.seoTitleEn : item.seoTitle,
    seoDescription:
      english && item.seoDescriptionEn?.trim()
        ? item.seoDescriptionEn
        : item.seoDescription,
  };
}
