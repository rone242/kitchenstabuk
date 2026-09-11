import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../database/prisma.service.js';

describe('AuthService', () => {
  const user = {
    id: '88e2845b-d061-4188-aabd-899db824fa3d',
    name: 'مدير الاختبار',
    email: 'admin@example.sa',
    phone: '+966500000000',
    status: 'ACTIVE',
    deletedAt: null,
    passwordHash: '',
    roles: [
      {
        role: {
          name: 'SUPER_ADMIN',
          permissions: [
            { permission: { key: 'users.manage' } },
            { permission: { key: 'audit.read' } },
          ],
        },
      },
    ],
  };

  beforeAll(async () => {
    user.passwordHash = await hash('CorrectPassword!123', 4);
  });

  function createSubject(foundUser: typeof user | null = user) {
    const client = {
      user: {
        findFirst: vi.fn().mockResolvedValue(foundUser),
        update: vi.fn().mockResolvedValue(foundUser),
      },
      refreshToken: {
        create: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    const prisma = { client } as unknown as PrismaService;
    const config = new ConfigService({
      JWT_ACCESS_SECRET: 'a'.repeat(40),
      JWT_REFRESH_SECRET: 'b'.repeat(40),
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '30d',
    });
    return {
      service: new AuthService(prisma, new JwtService(), config),
      client,
    };
  }

  it('creates a hashed refresh-token record and returns effective permissions', async () => {
    const { service, client } = createSubject();
    const session = await service.login(
      ' ADMIN@EXAMPLE.SA ',
      'CorrectPassword!123',
      { ipAddress: '127.0.0.1' },
    );

    expect(session.user.roles).toEqual(['SUPER_ADMIN']);
    expect(session.user.permissions).toEqual(['audit.read', 'users.manage']);
    expect(session.accessToken).not.toBe(session.refreshToken);
    const record = client.refreshToken.create.mock.calls[0]?.[0].data;
    expect(record.tokenHash).toHaveLength(64);
    expect(record.tokenHash).not.toContain(session.refreshToken);
    expect(client.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { emailNormalized: 'admin@example.sa' },
            { phoneNormalized: 'admin@example.sa' },
          ],
        },
      }),
    );
  });

  it('uses the same generic rejection for an unknown account', async () => {
    const { service, client } = createSubject(null);

    await expect(
      service.login('missing@example.sa', 'WrongPassword!', {}),
    ).rejects.toMatchObject({
      message: 'Invalid email, phone number, or password',
    });
    expect(client.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'auth.login.failed' }),
      }),
    );
  });
});
