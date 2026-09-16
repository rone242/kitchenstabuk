import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fileTypeFromBuffer } from 'file-type';
import { imageSize } from 'image-size';
import { PrismaService } from '../database/prisma.service.js';
import { paginationMeta } from '../common/dto/pagination.dto.js';
import {
  MediaQueryDto,
  UpdateMediaDto,
  UploadMediaDto,
} from './dto/media.dto.js';
import { StorageService } from './storage.service.js';

const allowedImages = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/gif', 'gif'],
]);

interface MutationContext {
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async list(query: MediaQueryDto) {
    const where = query.search
      ? {
          OR: [
            {
              originalName: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              altTextAr: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              altTextEn: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.mediaAsset.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.mediaAsset.count({ where }),
    ]);
    return { data, meta: paginationMeta(query.page, query.pageSize, total) };
  }

  async siteLogo() {
    const setting = await this.prisma.client.siteSetting.findUnique({
      where: { key: 'site.logoMediaId' },
    });
    return { mediaId: setting?.value ?? null };
  }

  async setSiteLogo(id: string, context: MutationContext) {
    const media = await this.find(id);
    await this.prisma.client.$transaction(async (transaction) => {
      await transaction.siteSetting.upsert({
        where: { key: 'site.logoMediaId' },
        update: { value: id, valueType: 'TEXT', isPublic: true },
        create: {
          key: 'site.logoMediaId',
          value: id,
          valueType: 'TEXT',
          isPublic: true,
          description: 'Media asset used as the public site logo',
        },
      });
      await transaction.auditLog.create({
        data: {
          ...context,
          action: 'settings.site_logo.updated',
          entityType: 'MediaAsset',
          entityId: id,
        },
      });
    });
    return media;
  }

  async upload(
    file: Express.Multer.File | undefined,
    input: UploadMediaDto,
    context: MutationContext,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    const maxBytes =
      this.config.get<number>('MAX_UPLOAD_SIZE_MB', 10) * 1024 * 1024;
    if (file.size > maxBytes)
      throw new BadRequestException('Image exceeds maximum size');

    const detected = await fileTypeFromBuffer(file.buffer);
    const extension = detected ? allowedImages.get(detected.mime) : undefined;
    if (!detected || !extension) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, AVIF, and GIF images are allowed',
      );
    }
    let dimensions: { width?: number; height?: number };
    try {
      const result = imageSize(file.buffer);
      dimensions = { width: result.width, height: result.height };
    } catch {
      throw new BadRequestException('The uploaded image is malformed');
    }
    if (!dimensions.width || !dimensions.height) {
      throw new BadRequestException('Image dimensions could not be determined');
    }

    const stored = await this.storage.put(
      file.buffer,
      extension,
      detected.mime,
    );
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        const media = await transaction.mediaAsset.create({
          data: {
            type: 'IMAGE',
            provider: stored.provider,
            storageKey: stored.key,
            originalName: safeOriginalName(file.originalname),
            mimeType: detected.mime,
            sizeBytes: file.size,
            width: dimensions.width,
            height: dimensions.height,
            altTextAr: input.altTextAr,
            altTextEn: input.altTextEn,
            publicUrl: stored.publicUrl,
            uploadedById: context.actorId,
          },
        });
        await transaction.auditLog.create({
          data: {
            ...context,
            action: 'media.uploaded',
            entityType: 'MediaAsset',
            entityId: media.id,
          },
        });
        return media;
      });
    } catch (error) {
      await this.storage
        .delete(stored.key, stored.provider)
        .catch(() => undefined);
      throw error;
    }
  }

  async update(id: string, input: UpdateMediaDto, context: MutationContext) {
    await this.find(id);
    return this.prisma.client.$transaction(async (transaction) => {
      const media = await transaction.mediaAsset.update({
        where: { id },
        data: input,
      });
      await transaction.auditLog.create({
        data: {
          ...context,
          action: 'media.updated',
          entityType: 'MediaAsset',
          entityId: id,
          changes: JSON.parse(JSON.stringify(input)),
        },
      });
      return media;
    });
  }

  async delete(id: string, context: MutationContext) {
    const media = await this.prisma.client.mediaAsset.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            categoryImages: true,
            serviceCoverImages: true,
            serviceGallery: true,
            requestAttachments: true,
            blogCoverImages: true,
            portfolioImages: true,
            portfolioBeforeImages: true,
          },
        },
      },
    });
    if (!media) throw new NotFoundException('Media asset not found');
    const logoSetting = await this.prisma.client.siteSetting.findFirst({
      where: { OR: [
        { key: { in: ['site.logoMediaId', 'site.thumbnailMediaId'] }, value: id },
        { key: 'site.sliderMediaIds', value: { contains: id } },
      ] },
      select: { id: true },
    });
    const references =
      Object.values(media._count).reduce((sum, count) => sum + count, 0) +
      (logoSetting ? 1 : 0);
    if (references > 0)
      throw new ConflictException('Media asset is still in use');

    await this.prisma.client.$transaction(async (transaction) => {
      await transaction.mediaAsset.delete({ where: { id } });
      await transaction.auditLog.create({
        data: {
          ...context,
          action: 'media.deleted',
          entityType: 'MediaAsset',
          entityId: id,
        },
      });
    });
    await this.storage.delete(media.storageKey, media.provider);
    return { id };
  }

  private async find(id: string) {
    const media = await this.prisma.client.mediaAsset.findUnique({
      where: { id },
    });
    if (!media) throw new NotFoundException('Media asset not found');
    return media;
  }
}

function safeOriginalName(name: string): string {
  const safe = [...name]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 ||
        code === 127 ||
        character === '/' ||
        character === '\\'
        ? '_'
        : character;
    })
    .join('')
    .slice(0, 255);
  return safe || 'image';
}
