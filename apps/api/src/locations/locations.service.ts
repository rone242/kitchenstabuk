import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'database';
import { paginationMeta } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  CreateCityDto,
  CreateDistrictDto,
  CreateRegionDto,
  LocationQueryDto,
  ReplaceServiceLocationsDto,
  UpdateCityDto,
  UpdateDistrictDto,
  UpdateRegionDto,
} from './dto/location.dto.js';

interface MutationContext {
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async options() {
    return this.prisma.client.country.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        regions: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            cities: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                districts: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });
  }

  async regions(query: LocationQueryDto) {
    const where: Prisma.RegionWhereInput = {
      ...(query.parentId ? { countryId: query.parentId } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search ? searchLocation(query.search) : {}),
    };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.region.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortDirection },
        include: { country: true, _count: { select: { cities: true } } },
      }),
      this.prisma.client.region.count({ where }),
    ]);
    return { data, meta: paginationMeta(query.page, query.pageSize, total) };
  }

  async createRegion(input: CreateRegionDto, context: MutationContext) {
    const countryId = input.countryId ?? (await this.saudiCountryId());
    await this.ensureRegionSlug(countryId, input.slug);
    const { countryId: _countryId, ...data } = input;
    return this.mutate('region.created', 'Region', context, (transaction) =>
      transaction.region.create({ data: { ...data, countryId } }),
    );
  }

  async updateRegion(id: string, input: UpdateRegionDto, context: MutationContext) {
    const current = await this.prisma.client.region.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Region not found');
    const countryId = input.countryId ?? current.countryId;
    if (input.slug) await this.ensureRegionSlug(countryId, input.slug, id);
    return this.mutate('region.updated', 'Region', context, (transaction) =>
      transaction.region.update({ where: { id }, data: input }), id, input,
    );
  }

  deactivateRegion(id: string, context: MutationContext) {
    return this.deactivate('region.deactivated', 'Region', id, context, (transaction) =>
      transaction.region.update({ where: { id }, data: { isActive: false } }),
    );
  }

  async cities(query: LocationQueryDto) {
    const where: Prisma.CityWhereInput = {
      ...(query.parentId ? { regionId: query.parentId } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search ? searchLocation(query.search) : {}),
    };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.city.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortDirection },
        include: { region: true, _count: { select: { districts: true, serviceLocations: true } } },
      }),
      this.prisma.client.city.count({ where }),
    ]);
    return { data, meta: paginationMeta(query.page, query.pageSize, total) };
  }

  async createCity(input: CreateCityDto, context: MutationContext) {
    await this.ensureRegion(input.regionId);
    await this.ensureCitySlug(input.slug);
    return this.mutate('city.created', 'City', context, (transaction) =>
      transaction.city.create({ data: input }),
    );
  }

  async updateCity(id: string, input: UpdateCityDto, context: MutationContext) {
    await this.ensureCity(id);
    if (input.regionId) await this.ensureRegion(input.regionId);
    if (input.slug) await this.ensureCitySlug(input.slug, id);
    return this.mutate('city.updated', 'City', context, (transaction) =>
      transaction.city.update({ where: { id }, data: input }), id, input,
    );
  }

  deactivateCity(id: string, context: MutationContext) {
    return this.deactivate('city.deactivated', 'City', id, context, (transaction) =>
      transaction.city.update({ where: { id }, data: { isActive: false } }),
    );
  }

  async districts(query: LocationQueryDto) {
    const where: Prisma.DistrictWhereInput = {
      ...(query.parentId ? { cityId: query.parentId } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search ? searchLocation(query.search) : {}),
    };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.district.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortDirection },
        include: { city: { include: { region: true } }, _count: { select: { serviceLocations: true } } },
      }),
      this.prisma.client.district.count({ where }),
    ]);
    return { data, meta: paginationMeta(query.page, query.pageSize, total) };
  }

  async createDistrict(input: CreateDistrictDto, context: MutationContext) {
    await this.ensureCity(input.cityId);
    await this.ensureDistrictSlug(input.cityId, input.slug);
    return this.mutate('district.created', 'District', context, (transaction) =>
      transaction.district.create({ data: input }),
    );
  }

  async updateDistrict(id: string, input: UpdateDistrictDto, context: MutationContext) {
    const current = await this.prisma.client.district.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('District not found');
    const cityId = input.cityId ?? current.cityId;
    if (input.cityId) await this.ensureCity(input.cityId);
    if (input.slug) await this.ensureDistrictSlug(cityId, input.slug, id);
    return this.mutate('district.updated', 'District', context, (transaction) =>
      transaction.district.update({ where: { id }, data: input }), id, input,
    );
  }

  deactivateDistrict(id: string, context: MutationContext) {
    return this.deactivate('district.deactivated', 'District', id, context, (transaction) =>
      transaction.district.update({ where: { id }, data: { isActive: false } }),
    );
  }

  async serviceLocations(serviceId: string) {
    await this.ensureService(serviceId);
    return this.prisma.client.serviceLocation.findMany({
      where: { serviceId },
      orderBy: [{ city: { nameAr: 'asc' } }, { district: { nameAr: 'asc' } }],
      include: { city: true, district: true },
    });
  }

  async replaceServiceLocations(
    serviceId: string,
    input: ReplaceServiceLocationsDto,
    context: MutationContext,
  ) {
    await this.ensureService(serviceId);
    const uniqueScopes = new Set<string>();
    for (const location of input.locations) {
      const scope = `${location.cityId}:${location.districtId ?? 'ALL'}`;
      if (uniqueScopes.has(scope)) throw new ConflictException('Duplicate service location');
      uniqueScopes.add(scope);
      const city = await this.prisma.client.city.findUnique({
        where: { id: location.cityId },
        select: { id: true, isActive: true },
      });
      if (!city) throw new NotFoundException('City not found');
      if (location.districtId) {
        const district = await this.prisma.client.district.findFirst({
          where: { id: location.districtId, cityId: location.cityId },
          select: { id: true },
        });
        if (!district) throw new ConflictException('District does not belong to city');
      }
    }

    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.serviceLocation.deleteMany({ where: { serviceId } });
      if (input.locations.length) {
        await transaction.serviceLocation.createMany({
          data: input.locations.map((location) => ({
            ...location,
            serviceId,
            scopeKey: location.districtId ?? '*',
          })),
        });
      }
      await transaction.auditLog.create({
        data: audit(context, 'service-locations.replaced', 'Service', serviceId, {
          locations: input.locations,
        }),
      });
      return transaction.serviceLocation.findMany({
        where: { serviceId },
        include: { city: true, district: true },
      });
    });
  }

  private async mutate<T extends { id: string }>(
    action: string,
    entityType: string,
    context: MutationContext,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
    entityId?: string,
    changes?: unknown,
  ) {
    return this.prisma.client.$transaction(async (transaction) => {
      const result = await operation(transaction);
      await transaction.auditLog.create({
        data: audit(context, action, entityType, entityId ?? result.id, changes),
      });
      return result;
    });
  }

  private async deactivate<T extends { id: string }>(
    action: string,
    entityType: string,
    id: string,
    context: MutationContext,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await this.mutate(action, entityType, context, operation, id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`${entityType} not found`);
      }
      throw error;
    }
  }

  private async saudiCountryId() {
    const country = await this.prisma.client.country.findUnique({ where: { isoCode: 'SA' } });
    if (!country) throw new NotFoundException('Saudi Arabia country record not found');
    return country.id;
  }

  private async ensureRegion(id: string) {
    if (!(await this.prisma.client.region.findUnique({ where: { id } }))) {
      throw new NotFoundException('Region not found');
    }
  }

  private async ensureCity(id: string) {
    if (!(await this.prisma.client.city.findUnique({ where: { id } }))) {
      throw new NotFoundException('City not found');
    }
  }

  private async ensureService(id: string) {
    if (!(await this.prisma.client.service.findFirst({ where: { id, deletedAt: null } }))) {
      throw new NotFoundException('Service not found');
    }
  }

  private async ensureRegionSlug(countryId: string, slug: string, excludeId?: string) {
    const found = await this.prisma.client.region.findFirst({
      where: { countryId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (found) throw new ConflictException('Region slug already exists');
  }

  private async ensureCitySlug(slug: string, excludeId?: string) {
    const found = await this.prisma.client.city.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (found) throw new ConflictException('City slug already exists');
  }

  private async ensureDistrictSlug(cityId: string, slug: string, excludeId?: string) {
    const found = await this.prisma.client.district.findFirst({
      where: { cityId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (found) throw new ConflictException('District slug already exists');
  }
}

function searchLocation(search: string) {
  return {
    OR: [
      { nameAr: { contains: search, mode: 'insensitive' as const } },
      { nameEn: { contains: search, mode: 'insensitive' as const } },
      { slug: { contains: search, mode: 'insensitive' as const } },
    ],
  };
}

function audit(
  context: MutationContext,
  action: string,
  entityType: string,
  entityId: string,
  changes?: unknown,
) {
  return {
    ...context,
    action,
    entityType,
    entityId,
    changes:
      changes === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(changes)) as Prisma.InputJsonValue),
  };
}
