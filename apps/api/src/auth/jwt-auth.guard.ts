import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { ACCESS_COOKIE, IS_PUBLIC_KEY } from './auth.constants.js';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
} from './auth.types.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Authentication required');

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'access') throw new Error('Wrong token type');

      const user = await this.prisma.client.user.findFirst({
        where: {
          id: payload.sub,
          status: 'ACTIVE',
          deletedAt: null,
          refreshTokens: {
            some: {
              id: payload.sessionId,
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                  permissions: {
                    select: { permission: { select: { key: true } } },
                  },
                },
              },
            },
          },
        },
      });
      if (!user) throw new Error('User unavailable');

      const permissions = new Set<string>();
      const roles = user.roles.map(({ role }) => {
        for (const item of role.permissions) permissions.add(item.permission.key);
        return role.name;
      });
      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles,
        permissions: [...permissions].sort(),
      };
      request.user = authenticatedUser;
      return true;
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
    return (request.cookies as Record<string, string> | undefined)?.[
      ACCESS_COOKIE
    ];
  }
}
