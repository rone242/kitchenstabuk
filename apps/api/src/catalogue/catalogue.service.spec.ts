import { ConflictException } from '@nestjs/common';
import { CatalogueService } from './catalogue.service.js';
import { PrismaService } from '../database/prisma.service.js';

const context = { actorId: 'administrator' };

function fixture() {
  const client = {
    service: { findFirst: vi.fn() },
    serviceField: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  const service = new CatalogueService({ client } as unknown as PrismaService);
  return { client, service };
}

describe('Catalogue mutation validation', () => {
  it.each([{ startingPrice: 250 }, { maximumPrice: 50 }])(
    'rejects a partial update that reverses the stored price range: %j',
    async (input) => {
      const { client, service } = fixture();
      client.service.findFirst.mockResolvedValue({
        priceType: 'RANGE',
        startingPrice: 100,
        maximumPrice: 200,
      });
      await expect(
        service.updateService('service', input, context),
      ).rejects.toThrow(ConflictException);
      expect(client.$transaction).not.toHaveBeenCalled();
    },
  );

  it('allows translating a standalone checkbox without selection options', async () => {
    const { client, service } = fixture();
    client.serviceField.findFirst.mockResolvedValue({
      type: 'CHECKBOX',
      options: [],
    });
    client.$transaction.mockResolvedValue({ labelEn: 'Packing required' });
    await expect(
      service.updateField(
        'service',
        'field',
        { labelEn: 'Packing required', options: [] },
        context,
      ),
    ).resolves.toMatchObject({ labelEn: 'Packing required' });
  });

  it('rejects changing a text field into a selection without options', async () => {
    const { client, service } = fixture();
    client.serviceField.findFirst.mockResolvedValue({
      type: 'TEXT',
      options: [],
    });
    await expect(
      service.updateField('service', 'field', { type: 'SELECT' }, context),
    ).rejects.toThrow(ConflictException);
    expect(client.$transaction).not.toHaveBeenCalled();
  });

  it('rejects changing a selection into text while retaining active options', async () => {
    const { client, service } = fixture();
    client.serviceField.findFirst.mockResolvedValue({
      type: 'SELECT',
      options: [{ value: 'small', isActive: true }],
    });
    await expect(
      service.updateField('service', 'field', { type: 'TEXT' }, context),
    ).rejects.toThrow(ConflictException);
  });

  it.each([
    [{ value: 'small', labelAr: 'صغير', isActive: false }],
    [
      { value: 'small', labelAr: 'صغير' },
      { value: 'small', labelAr: 'مكرر' },
    ],
  ])('rejects unusable or duplicate selection options', async (...options) => {
    const { client, service } = fixture();
    client.service.findFirst.mockResolvedValue({ id: 'service' });
    await expect(
      service.createField(
        'service',
        {
          key: 'size',
          type: 'SELECT',
          labelAr: 'الحجم',
          options,
        },
        context,
      ),
    ).rejects.toThrow(ConflictException);
    expect(client.$transaction).not.toHaveBeenCalled();
  });
});
