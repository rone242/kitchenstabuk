import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../database/prisma.service.js';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
} from './auth.types.js';

const DUMMY_PASSWORD_HASH =
  '$2b$12$gMkI.9SJSw4ze1HYM1WYQephj6CLxIoi8ygo1FJpGT24JtA35h0GK';
const GENERIC_LOGIN_ERROR = 'Invalid email, phone number, or password';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    identifier: string,
    password: string,
    context: RequestContext,
  ): Promise<IssuedSession> {
    const normalized = normalizeIdentifier(identifier);
    const user = await this.prisma.client.user.findFirst({
      where: {
        OR: [
          { emailNormalized: normalized },
          { phoneNormalized: normalized },
        ],
      },
      include: userAuthorizationInclude,
    });

    const passwordMatches = await compare(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !passwordMatches || user.status !== 'ACTIVE' || user.deletedAt) {
      await this.writeAudit(null, 'auth.login.failed', 'User', undefined, context);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const session = await this.issueSession(user, randomUUID(), context);
    await this.prisma.client.$transaction([
      this.prisma.client.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.client.auditLog.create({
        data: {
          actorId: user.id,
          action: 'auth.login.succeeded',
          entityType: 'User',
          entityId: user.id,
          summary: 'Administrative login succeeded',
          ...context,
        },
      }),
    ]);
    return session;
  }

  async refresh(
    token: string,
    csrfToken: string,
    context: RequestContext,
  ): Promise<IssuedSession> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (
        payload.type !== 'refresh' ||
        payload.csrfHash !== hashToken(csrfToken)
      ) {
        throw new Error('Invalid refresh token');
      }
    } catch {
      throw new UnauthorizedException('Session expired');
    }

    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: { include: userAuthorizationInclude } },
    });
    const tokenMatches = stored?.tokenHash === hashToken(token);
    const invalid =
      !stored ||
      !tokenMatches ||
      stored.familyId !== payload.familyId ||
      stored.userId !== payload.sub ||
      stored.expiresAt <= new Date() ||
      stored.user.status !== 'ACTIVE' ||
      Boolean(stored.user.deletedAt);

    if (invalid || stored.revokedAt) {
      if (stored) {
        await this.revokeFamily(stored.familyId, stored.userId, context, true);
      }
      throw new UnauthorizedException('Session expired');
    }

    const session = await this.createSessionTokens(
      stored.user,
      stored.familyId,
      context,
    );
    const rotated = await this.prisma.client.$transaction(async (transaction) => {
      const result = await transaction.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      });
      if (result.count !== 1) return false;
      await transaction.refreshToken.create({ data: session.record });
      await transaction.auditLog.create({
        data: {
          actorId: stored.userId,
          action: 'auth.session.rotated',
          entityType: 'RefreshToken',
          entityId: session.record.id,
          summary: 'Administrative session refreshed',
          ...context,
        },
      });
      return true;
    });

    if (!rotated) {
      await this.revokeFamily(stored.familyId, stored.userId, context, true);
      throw new UnauthorizedException('Session expired');
    }
    return session.response;
  }

  async logout(token: string | undefined, context: RequestContext): Promise<void> {
    if (!token) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        ignoreExpiration: true,
      });
      await this.revokeFamily(payload.familyId, payload.sub, context, false);
    } catch {
      return;
    }
  }

  private async issueSession(
    user: UserWithAuthorization,
    familyId: string,
    context: RequestContext,
  ): Promise<IssuedSession> {
    const session = await this.createSessionTokens(user, familyId, context);
    await this.prisma.client.refreshToken.create({ data: session.record });
    return session.response;
  }

  private async createSessionTokens(
    user: UserWithAuthorization,
    familyId: string,
    context: RequestContext,
  ): Promise<{ response: IssuedSession; record: RefreshTokenRecord }> {
    const id = randomUUID();
    const csrfToken = randomBytes(32).toString('base64url');
    const accessMaxAgeMs = parseDuration(
      this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
    );
    const refreshMaxAgeMs = parseDuration(
      this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
    );
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      type: 'access',
      sessionId: id,
      familyId,
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      jti: id,
      familyId,
      csrfHash: hashToken(csrfToken),
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: Math.floor(accessMaxAgeMs / 1000),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: Math.floor(refreshMaxAgeMs / 1000),
      }),
    ]);

    return {
      response: {
        accessToken,
        refreshToken,
        csrfToken,
        accessMaxAgeMs,
        refreshMaxAgeMs,
        user: toAuthenticatedUser(user),
      },
      record: {
        id,
        userId: user.id,
        familyId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshMaxAgeMs),
        ...context,
      },
    };
  }

  private async revokeFamily(
    familyId: string,
    userId: string,
    context: RequestContext,
    reuseDetected: boolean,
  ): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.refreshToken.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.client.auditLog.create({
        data: {
          actorId: userId,
          action: reuseDetected
            ? 'auth.refresh.reuse-detected'
            : 'auth.logout',
          entityType: 'RefreshToken',
          entityId: familyId,
          summary: reuseDetected
            ? 'Refresh-token reuse detected; token family revoked'
            : 'Administrative session ended',
          ...context,
        },
      }),
    ]);
  }

  private async writeAudit(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string | undefined,
    context: RequestContext,
  ): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: { actorId, action, entityType, entityId, ...context },
    });
  }
}

const userAuthorizationInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
} as const;

type UserWithAuthorization = {
  id: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  name: string;
  status: string;
  deletedAt: Date | null;
  roles: Array<{
    role: {
      name: string;
      permissions: Array<{ permission: { key: string } }>;
    };
  }>;
};

interface RefreshTokenRecord extends RequestContext {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

function toAuthenticatedUser(user: UserWithAuthorization): AuthenticatedUser {
  const permissions = new Set<string>();
  const roles = user.roles.map(({ role }) => {
    for (const item of role.permissions) permissions.add(item.permission.key);
    return role.name;
  });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    roles,
    permissions: [...permissions].sort(),
  };
}

function normalizeIdentifier(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes('@')) return trimmed;
  const phone = trimmed.replace(/[\s()-]/g, '');
  if (phone.startsWith('05')) return `+966${phone.slice(1)}`;
  if (phone.startsWith('966')) return `+${phone}`;
  return phone;
}

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseDuration(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error(`Invalid token duration: ${value}`);
  const quantity = Number(match[1]);
  const multipliers = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return quantity * multipliers[match[2] as keyof typeof multipliers];
}
