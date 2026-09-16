import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'database';
import { PrismaService } from '../database/prisma.service.js';
import { paginationMeta } from '../common/dto/pagination.dto.js';
import {
  CategoryQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';
import {
  CreateServiceDto,
  ServiceQueryDto,
  UpdateServiceDto,
} from './dto/service.dto.js';
import {
  CreateServiceFieldDto,
  UpdateServiceFieldDto,
} from './dto/service-field.dto.js';
import { CreatePortfolioDto, UpdatePortfolioDto } from './dto/portfolio.dto.js';

interface MutationContext {
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async portfolio() {
    return this.prisma.client.portfolioItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { completedAt: 'desc' }],
      include: { service: true, city: true, image: true, beforeImage: true },
    });
  }

  async createPortfolio(input: CreatePortfolioDto, context: MutationContext) {
    if (input.beforeImageId) await this.ensureImage(input.beforeImageId);
    if (input.imageId) await this.ensureImage(input.imageId);
    const { completedAt, ...data } = input;
    return this.prisma.client.$transaction(async (transaction) => {
      const project = await transaction.portfolioItem.create({
        data: {
          ...data,
          completedAt: completedAt ? new Date(completedAt) : null,
        },
      });
      await transaction.auditLog.create({
        data: auditData(
          context,
          'portfolio.created',
          'PortfolioItem',
          project.id,
        ),
      });
      return project;
    });
  }

  async updatePortfolio(
    id: string,
    input: UpdatePortfolioDto,
    context: MutationContext,
  ) {
    const existing = await this.prisma.client.portfolioItem.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Project not found');
    if (input.beforeImageId) await this.ensureImage(input.beforeImageId);
    if (input.imageId) await this.ensureImage(input.imageId);
    const { completedAt, ...data } = input;
    return this.prisma.client.$transaction(async (transaction) => {
      const project = await transaction.portfolioItem.update({
        where: { id },
        data: {
          ...data,
          ...(completedAt !== undefined
            ? { completedAt: completedAt ? new Date(completedAt) : null }
            : {}),
        },
      });
      await transaction.auditLog.create({
        data: auditData(context, 'portfolio.updated', 'PortfolioItem', id),
      });
      return project;
    });
  }

  async categories(query: CategoryQueryDto) {
    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              {
                nameAr: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                nameEn: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                slug: { contains: query.search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.category.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortDirection },
        include: {
          image: true,
          _count: { select: { services: { where: { deletedAt: null } } } },
        },
      }),
      this.prisma.client.category.count({ where }),
    ]);
    return { data, meta: paginationMeta(query.page, query.pageSize, total) };
  }

  async category(id: string) {
    const category = await this.prisma.client.category.findFirst({
      where: { id, deletedAt: null },
      include: { image: true, _count: { select: { services: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async createCategory(input: CreateCategoryDto, context: MutationContext) {
    await this.ensureCategorySlug(input.slug);
    if (input.imageId) await this.ensureImage(input.imageId);
    return this.prisma.client.$transaction(async (transaction) => {
      const category = await transaction.category.create({ data: input });
      await transaction.auditLog.create({
        data: auditData(context, 'category.created', 'Category', category.id, {
          after: input,
        }),
      });
      return category;
    });
  }

  async updateCategory(
    id: string,
    input: UpdateCategoryDto,
    context: MutationContext,
  ) {
    const before = await this.category(id);
    if (input.slug) await this.ensureCategorySlug(input.slug, id);
    if (input.imageId) await this.ensureImage(input.imageId);
    return this.prisma.client.$transaction(async (transaction) => {
      const category = await transaction.category.update({
        where: { id },
        data: input,
      });
      await transaction.auditLog.create({
        data: auditData(context, 'category.updated', 'Category', id, {
          before: pickAuditFields(before),
          after: input,
        }),
      });
      return category;
    });
  }

  async deleteCategory(id: string, context: MutationContext) {
    await this.category(id);
    const services = await this.prisma.client.service.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (services > 0) {
      throw new ConflictException('Move or delete category services first');
    }
    return this.prisma.client.$transaction(async (transaction) => {
      const category = await transaction.category.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await transaction.auditLog.create({
        data: auditData(context, 'category.deleted', 'Category', id),
      });
      return category;
    });
  }

  async services(query: ServiceQueryDto) {
    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              {
                nameAr: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                nameEn: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                slug: { contains: query.search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.service.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy]: query.sortDirection },
        include: {
          category: { select: { id: true, nameAr: true, nameEn: true } },
          coverImage: true,
          _count: { select: { fields: true, locations: true, gallery: true } },
        },
      }),
      this.prisma.client.service.count({ where }),
    ]);
    return { data, meta: paginationMeta(query.page, query.pageSize, total) };
  }

  async service(id: string) {
    const service = await this.prisma.client.service.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        coverImage: true,
        gallery: { orderBy: { sortOrder: 'asc' }, include: { media: true } },
        fields: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } } },
        },
        locations: {
          include: { city: true, district: true },
          orderBy: { city: { nameAr: 'asc' } },
        },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async createService(input: CreateServiceDto, context: MutationContext) {
    await this.ensureServiceDependencies(input);
    const { galleryIds = [], ...data } = input;
    return this.prisma.client.$transaction(async (transaction) => {
      const service = await transaction.service.create({
        data: {
          ...data,
          ...validatedPrices(input),
          gallery: {
            create: galleryIds.map((mediaId, sortOrder) => ({
              mediaId,
              sortOrder,
            })),
          },
        },
      });
      await transaction.auditLog.create({
        data: auditData(context, 'service.created', 'Service', service.id, {
          after: input,
        }),
      });
      return service;
    });
  }

  async updateService(
    id: string,
    input: UpdateServiceDto,
    context: MutationContext,
  ) {
    const before = await this.service(id);
    const prices = validatedPrices({
      priceType: input.priceType ?? before.priceType,
      startingPrice:
        input.startingPrice !== undefined
          ? input.startingPrice
          : before.startingPrice,
      maximumPrice:
        input.maximumPrice !== undefined
          ? input.maximumPrice
          : before.maximumPrice,
    });
    await this.ensureServiceDependencies(input, id);
    const { galleryIds, ...data } = input;
    return this.prisma.client.$transaction(async (transaction) => {
      if (galleryIds) {
        await transaction.serviceImage.deleteMany({ where: { serviceId: id } });
        await transaction.serviceImage.createMany({
          data: galleryIds.map((mediaId, sortOrder) => ({
            serviceId: id,
            mediaId,
            sortOrder,
          })),
        });
      }
      const service = await transaction.service.update({
        where: { id },
        data: { ...data, ...prices },
      });
      await transaction.auditLog.create({
        data: auditData(context, 'service.updated', 'Service', id, {
          before: pickAuditFields(before),
          after: input,
        }),
      });
      return service;
    });
  }

  async deleteService(id: string, context: MutationContext) {
    await this.service(id);
    return this.prisma.client.$transaction(async (transaction) => {
      const service = await transaction.service.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await transaction.serviceLocation.updateMany({
        where: { serviceId: id },
        data: { isActive: false },
      });
      await transaction.auditLog.create({
        data: auditData(context, 'service.deleted', 'Service', id),
      });
      return service;
    });
  }

  async fields(serviceId: string) {
    await this.service(serviceId);
    return this.prisma.client.serviceField.findMany({
      where: { serviceId },
      orderBy: { sortOrder: 'asc' },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async createField(
    serviceId: string,
    input: CreateServiceFieldDto,
    context: MutationContext,
  ) {
    await this.service(serviceId);
    this.validateFieldOptions(input.type, input.options ?? []);
    const { options = [], validationRules, ...data } = input;
    return this.prisma.client.$transaction(async (transaction) => {
      const field = await transaction.serviceField.create({
        data: {
          ...data,
          serviceId,
          validationRules:
            validationRules === undefined ? undefined : toJson(validationRules),
          options: { create: options },
        },
        include: { options: true },
      });
      await transaction.auditLog.create({
        data: auditData(
          context,
          'service-field.created',
          'ServiceField',
          field.id,
          {
            serviceId,
            after: input,
          },
        ),
      });
      return field;
    });
  }

  async updateField(
    serviceId: string,
    fieldId: string,
    input: UpdateServiceFieldDto,
    context: MutationContext,
  ) {
    const before = await this.prisma.client.serviceField.findFirst({
      where: { id: fieldId, serviceId },
      include: { options: true },
    });
    if (!before) throw new NotFoundException('Service field not found');
    const type = input.type ?? before.type;
    this.validateFieldOptions(
      type,
      input.options ?? before.options.filter((option) => option.isActive),
    );
    const { options, validationRules, ...data } = input;
    return this.prisma.client.$transaction(async (transaction) => {
      if (options) {
        const values = options.map((option) => option.value);
        await transaction.serviceFieldOption.updateMany({
          where: { fieldId, value: { notIn: values } },
          data: { isActive: false },
        });
        for (const option of options) {
          await transaction.serviceFieldOption.upsert({
            where: { fieldId_value: { fieldId, value: option.value } },
            create: { ...option, fieldId },
            update: option,
          });
        }
      }
      const field = await transaction.serviceField.update({
        where: { id: fieldId },
        data: {
          ...data,
          validationRules:
            validationRules === undefined ? undefined : toJson(validationRules),
        },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });
      await transaction.auditLog.create({
        data: auditData(
          context,
          'service-field.updated',
          'ServiceField',
          fieldId,
          {
            serviceId,
            before,
            after: input,
          },
        ),
      });
      return field;
    });
  }

  async deleteField(
    serviceId: string,
    fieldId: string,
    context: MutationContext,
  ) {
    const field = await this.prisma.client.serviceField.findFirst({
      where: { id: fieldId, serviceId },
      include: { _count: { select: { answers: true } } },
    });
    if (!field) throw new NotFoundException('Service field not found');
    if (field._count.answers > 0) {
      throw new ConflictException(
        'Deactivate fields that already have answers',
      );
    }
    return this.prisma.client.$transaction(async (transaction) => {
      await transaction.serviceField.delete({ where: { id: fieldId } });
      await transaction.auditLog.create({
        data: auditData(
          context,
          'service-field.deleted',
          'ServiceField',
          fieldId,
          {
            serviceId,
          },
        ),
      });
      return { id: fieldId };
    });
  }

  private async ensureCategorySlug(slug: string, excludeId?: string) {
    const existing = await this.prisma.client.category.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Category slug already exists');
  }

  private async ensureServiceDependencies(
    input: CreateServiceDto | UpdateServiceDto,
    excludeId?: string,
  ) {
    if (input.slug) {
      const existing = await this.prisma.client.service.findFirst({
        where: {
          slug: input.slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (existing) throw new ConflictException('Service slug already exists');
    }
    if (input.categoryId) {
      const category = await this.prisma.client.category.findFirst({
        where: { id: input.categoryId, deletedAt: null },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('Category not found');
    }
    const mediaIds = [input.coverImageId, ...(input.galleryIds ?? [])].filter(
      (id): id is string => Boolean(id),
    );
    if (mediaIds.length) {
      const count = await this.prisma.client.mediaAsset.count({
        where: { id: { in: [...new Set(mediaIds)] }, type: 'IMAGE' },
      });
      if (count !== new Set(mediaIds).size) {
        throw new NotFoundException('One or more images were not found');
      }
    }
    if (
      input.startingPrice !== undefined &&
      input.maximumPrice !== undefined &&
      input.maximumPrice < input.startingPrice
    ) {
      throw new ConflictException(
        'Maximum price must not be less than starting price',
      );
    }
  }

  private async ensureImage(id: string) {
    const image = await this.prisma.client.mediaAsset.findFirst({
      where: { id, type: 'IMAGE' },
      select: { id: true },
    });
    if (!image) throw new NotFoundException('Image not found');
  }

  private validateFieldOptions(
    type: string,
    options: { value: string; isActive?: boolean }[],
  ) {
    const selectable = ['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX'].includes(
      type,
    );
    if (
      selectable &&
      type !== 'CHECKBOX' &&
      !options.some((option) => option.isActive !== false)
    ) {
      throw new ConflictException(
        'Selectable fields require at least one option',
      );
    }
    if (
      new Set(options.map((option) => option.value)).size !== options.length
    ) {
      throw new ConflictException('Field option values must be unique');
    }
    if (!selectable && options.length > 0) {
      throw new ConflictException('This field type does not accept options');
    }
  }
}

function auditData(
  context: MutationContext,
  action: string,
  entityType: string,
  entityId: string,
  changes?: unknown,
) {
  return {
    actorId: context.actorId,
    action,
    entityType,
    entityId,
    changes: changes === undefined ? undefined : toJson(changes),
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

function pickAuditFields<T extends object>(value: T) {
  const fields = { ...value } as Record<string, unknown>;
  delete fields.createdAt;
  delete fields.updatedAt;
  return fields;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function validatedPrices(input: {
  priceType?: string;
  startingPrice?: unknown;
  maximumPrice?: unknown;
}) {
  const type = input.priceType ?? 'QUOTE_REQUIRED';
  if (type === 'QUOTE_REQUIRED')
    return { startingPrice: null, maximumPrice: null };
  const start =
    input.startingPrice == null ? null : Number(input.startingPrice);
  const max = input.maximumPrice == null ? null : Number(input.maximumPrice);
  if (
    start === null ||
    !Number.isFinite(start) ||
    start < 0 ||
    (type === 'RANGE' && (max === null || !Number.isFinite(max) || max < start))
  ) {
    throw new ConflictException(
      'Provide a valid price for the selected price type',
    );
  }
  return { startingPrice: start, maximumPrice: type === 'RANGE' ? max : null };
}
