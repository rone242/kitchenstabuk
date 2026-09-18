import { plainToInstance } from 'class-transformer';
import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from '../auth/authorization.guard.js';
import 'reflect-metadata';
import { validate } from 'class-validator';
import type { Request } from 'express';
import {
  SiteSettingsController,
  SiteSettingsDto,
} from './site-settings.controller.js';
import type { PrismaService } from '../database/prisma.service.js';

const imageId = 'cfe0596c-631a-43e7-82bb-3f5e0a51f232';
function input() {
  return Object.assign(new SiteSettingsDto(), {
    titleAr: '',
    titleEn: 'Our services',
    descriptionAr: '',
    descriptionEn: '',
    locationTitleAr: '',
    locationTitleEn: 'Services in Tabuk',
    theme: 'dark',
    defaultLocale: 'en',
    logoMediaId: null,
    thumbnailMediaId: imageId,
    heroBackgroundMediaId: imageId,
    heroArtMediaId: imageId,
    faviconMediaId: imageId,
    officeTitleAr: 'مكتبنا',
    officeTitleEn: 'Our office',
    officeAddressAr: 'تبوك',
    officeAddressEn: 'Tabuk',
    officeLatitude: '28.3838',
    officeLongitude: '36.5550',
    sliderMediaIds: [imageId],
  });
}
function fixture() {
  const tx = {
    mediaAsset: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi
        .fn()
        .mockResolvedValue([
          { id: imageId, publicUrl: 'https://example.com/image.jpg' },
        ]),
    },
    siteSetting: { upsert: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: vi.fn() },
  };
  const client = { ...tx, $transaction: vi.fn(async (fn) => fn(tx)) };
  return {
    tx,
    controller: new SiteSettingsController({
      client,
    } as unknown as PrismaService),
  };
}
describe('Site settings', () => {
  it('normalizes contact numbers and rejects invalid destinations', async () => {
    const valid = plainToInstance(SiteSettingsDto, {
      ...input(),
      phone: '+966 (50) 123-4567',
      whatsapp: '',
    });
    expect(valid.phone).toBe('+966501234567');
    expect(await validate(valid)).toHaveLength(0);
    for (const phone of ['javascript:alert(1)', '123', '+1234567890123456']) {
      expect(
        (await validate(Object.assign(input(), { phone }))).length,
      ).toBeGreaterThan(0);
    }
  });
  it('updates existing site-wide contact keys and supports hiding a contact button', async () => {
    const { tx, controller } = fixture();
    await controller.save(
      Object.assign(input(), { phone: '+966501234567', whatsapp: '' }),
      { user: { id: 'admin' } } as Request,
    );
    expect(tx.siteSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'contact.phone' },
        update: { value: '+966501234567', isPublic: true },
      }),
    );
    expect(tx.siteSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'contact.whatsapp' },
        update: { value: '', isPublic: true },
      }),
    );
  });

  it.each(['read', 'save'] as const)(
    'requires content permission for admin %s',
    (method) => {
      const guard = new AuthorizationGuard(new Reflector());
      const context = {
        getHandler: () => SiteSettingsController.prototype[method],
        getClass: () => SiteSettingsController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { roles: [], permissions: [] } }),
        }),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    },
  );
  it('validates image IDs, image count, theme, and metadata length', async () => {
    expect(await validate(input())).toHaveLength(0);
    for (const invalid of [
      { theme: 'invalid' },
      { titleEn: 'x'.repeat(161) },
      { officeLatitude: '120' },
      { officeLongitude: '200' },
      { sliderMediaIds: Array(9).fill(imageId) },
      { thumbnailMediaId: 'javascript:bad' },
    ])
      expect(
        (await validate(Object.assign(input(), invalid))).length,
      ).toBeGreaterThan(0);
  });
  it('rejects missing images before writing settings', async () => {
    const { tx, controller } = fixture();
    tx.mediaAsset.count.mockResolvedValue(0);
    await expect(
      controller.save(input(), { user: { id: 'admin' } } as Request),
    ).rejects.toThrow('Select existing images');
    expect(tx.siteSetting.upsert).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('saves supported settings and audits the change atomically', async () => {
    const { tx, controller } = fixture();
    await controller.save(input(), { user: { id: 'admin' } } as Request);
    expect(tx.siteSetting.upsert).toHaveBeenCalledTimes(20);
    expect(tx.siteSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'site.sliderMediaIds' },
        update: { value: JSON.stringify([imageId]), isPublic: true },
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'admin',
        action: 'settings.site.updated',
        entityType: 'SiteSetting',
      },
    });
  });
  it('resolves public images in configured order and limits settings to known keys', async () => {
    const { tx, controller } = fixture();
    tx.siteSetting.findMany.mockResolvedValue([
      { key: 'site.sliderMediaIds', value: JSON.stringify([imageId]) },
      { key: 'site.thumbnailMediaId', value: imageId },
      { key: 'site.heroBackgroundMediaId', value: imageId },
      { key: 'site.heroArtMediaId', value: imageId },
      { key: 'site.faviconMediaId', value: imageId },
    ]);
    const result = await controller.publicSettings();
    expect(result.slides[0]?.id).toBe(imageId);
    expect(result.thumbnail?.publicUrl).toBe('https://example.com/image.jpg');
    expect(result.heroBackground?.publicUrl).toBe(
      'https://example.com/image.jpg',
    );
    expect(result.heroArt?.publicUrl).toBe('https://example.com/image.jpg');
    expect(result.favicon?.publicUrl).toBe('https://example.com/image.jpg');
    expect(tx.siteSetting.findMany).toHaveBeenCalledWith({
      where: {
        key: {
          in: expect.arrayContaining(['site.titleEn', 'site.sliderMediaIds']),
        },
      },
    });
  });
});
