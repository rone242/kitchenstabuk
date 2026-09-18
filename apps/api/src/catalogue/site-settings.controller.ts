import { Transform } from 'class-transformer';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  Req,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';
import type { Request } from 'express';
import { Public, RequirePermissions } from '../auth/auth.decorators.js';
import { PrismaService } from '../database/prisma.service.js';

export class SiteSettingsDto {
  @IsOptional() @IsString() @MaxLength(160) officeTitleAr?: string;
  @IsOptional() @IsString() @MaxLength(160) officeTitleEn?: string;
  @IsOptional() @IsString() @MaxLength(300) officeAddressAr?: string;
  @IsOptional() @IsString() @MaxLength(300) officeAddressEn?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsLatitude()
  officeLatitude?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === '' ? undefined : value,
  )
  @IsLongitude()
  officeLongitude?: string;
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  )
  @Matches(/^(?:\+?[1-9]\d{6,14})?$/)
  phone?: string;
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  )
  @Matches(/^(?:\+?[1-9]\d{6,14})?$/)
  whatsapp?: string;
  @IsString() @MaxLength(160) titleAr!: string;
  @IsString() @MaxLength(160) titleEn!: string;
  @IsString() @MaxLength(500) descriptionAr!: string;
  @IsString() @MaxLength(500) descriptionEn!: string;
  @IsString() @MaxLength(160) locationTitleAr!: string;
  @IsString() @MaxLength(160) locationTitleEn!: string;
  @IsIn(['light', 'dark', 'system']) theme!: string;
  @IsIn(['ar', 'en']) defaultLocale!: string;
  @IsOptional() @IsUUID() logoMediaId?: string | null;
  @IsOptional() @IsUUID() thumbnailMediaId?: string | null;
  @IsOptional() @IsUUID() heroBackgroundMediaId?: string | null;
  @IsOptional() @IsUUID() heroArtMediaId?: string | null;
  @IsOptional() @IsUUID() faviconMediaId?: string | null;
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  sliderMediaIds!: string[];
}
const fields = [
  'phone',
  'whatsapp',
  'officeTitleAr',
  'officeTitleEn',
  'officeAddressAr',
  'officeAddressEn',
  'officeLatitude',
  'officeLongitude',
  'titleAr',
  'titleEn',
  'descriptionAr',
  'descriptionEn',
  'locationTitleAr',
  'locationTitleEn',
  'theme',
  'defaultLocale',
  'logoMediaId',
  'thumbnailMediaId',
  'heroBackgroundMediaId',
  'heroArtMediaId',
  'faviconMediaId',
  'sliderMediaIds',
] as const;
const settingKey = (field: (typeof fields)[number]) =>
  `${field === 'phone' || field === 'whatsapp' ? 'contact' : 'site'}.${field}`;
const keys = fields.map(settingKey);

@Controller()
export class SiteSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermissions('content.manage')
  @Get('admin/site-settings')
  async read(): Promise<
    Partial<
      Record<Exclude<(typeof fields)[number], 'sliderMediaIds'>, string>
    > & { sliderMediaIds: string[] }
  > {
    const rows = await this.prisma.client.siteSetting.findMany({
      where: { key: { in: keys } },
    });
    const values = Object.fromEntries(
      rows.map((row) => [row.key.slice(row.key.indexOf('.') + 1), row.value]),
    );
    return {
      ...values,
      sliderMediaIds: JSON.parse(values.sliderMediaIds || '[]') as string[],
    };
  }

  @Public()
  @Get('catalogue/site-settings')
  async publicSettings() {
    const settings = await this.read();
    const ids = [
      settings.logoMediaId,
      settings.thumbnailMediaId,
      settings.heroBackgroundMediaId,
      settings.heroArtMediaId,
      settings.faviconMediaId,
      ...settings.sliderMediaIds,
    ].filter((id): id is string => !!id);
    const media = await this.prisma.client.mediaAsset.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        publicUrl: true,
        altTextAr: true,
        altTextEn: true,
        width: true,
        height: true,
      },
    });
    return {
      ...settings,
      logo: media.find((image) => image.id === settings.logoMediaId) ?? null,
      thumbnail:
        media.find((image) => image.id === settings.thumbnailMediaId) ?? null,
      heroBackground:
        media.find((image) => image.id === settings.heroBackgroundMediaId) ??
        null,
      heroArt: media.find((image) => image.id === settings.heroArtMediaId) ?? null,
      favicon: media.find((image) => image.id === settings.faviconMediaId) ?? null,
      slides: settings.sliderMediaIds
        .map((id) => media.find((image) => image.id === id))
        .filter(Boolean),
    };
  }

  @RequirePermissions('content.manage')
  @Put('admin/site-settings')
  async save(@Body() input: SiteSettingsDto, @Req() request: Request) {
    const ids = [
      ...new Set(
        [
          input.logoMediaId,
          input.thumbnailMediaId,
          input.heroBackgroundMediaId,
          input.heroArtMediaId,
          input.faviconMediaId,
          ...input.sliderMediaIds,
        ].filter((id): id is string => !!id),
      ),
    ];
    await this.prisma.client.$transaction(async (tx) => {
      const count = await tx.mediaAsset.count({
        where: {
          id: { in: ids },
          mimeType: { startsWith: 'image/' },
          publicUrl: { not: null },
        },
      });
      if (count !== ids.length)
        throw new BadRequestException(
          'Select existing images with public URLs',
        );
      for (const field of fields) {
        if (
          (field === 'phone' || field === 'whatsapp') &&
          input[field] === undefined
        )
          continue;
        const value =
          field === 'sliderMediaIds'
            ? JSON.stringify(input[field])
            : (input[field] ?? '');
        await tx.siteSetting.upsert({
          where: { key: settingKey(field) },
          create: { key: settingKey(field), value, isPublic: true },
          update: { value, isPublic: true },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'settings.site.updated',
          entityType: 'SiteSetting',
        },
      });
    });
    return this.read();
  }
}
