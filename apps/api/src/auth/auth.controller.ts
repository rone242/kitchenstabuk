import { timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
} from './auth.constants.js';
import { Public } from './auth.decorators.js';
import { AuthService, type IssuedSession } from './auth.service.js';
import type { AuthenticatedUser } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({
    default: {
      limit: () => Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5),
      ttl: () => Number(process.env.LOGIN_RATE_LIMIT_TTL_MS ?? 60_000),
    },
  })
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const session = await this.auth.login(
      body.identifier,
      body.password,
      requestContext(request),
    );
    this.setSessionCookies(response, session);
    return { user: session.user };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthenticatedUser }> {
    const refreshToken = readCookie(request, REFRESH_COOKIE);
    const csrfToken = this.requireCsrf(request);
    if (!refreshToken) throw new UnauthorizedException('Session expired');
    const session = await this.auth.refresh(
      refreshToken,
      csrfToken,
      requestContext(request),
    );
    this.setSessionCookies(response, session);
    return { user: session.user };
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = readCookie(request, REFRESH_COOKIE);
    if (refreshToken) this.requireCsrf(request);
    await this.auth.logout(refreshToken, requestContext(request));
    this.clearSessionCookies(response);
  }

  @Get('me')
  me(@Req() request: Request): { user: AuthenticatedUser } {
    return { user: request.user! };
  }

  private setSessionCookies(response: Response, session: IssuedSession): void {
    response.cookie(ACCESS_COOKIE, session.accessToken, {
      ...this.baseCookieOptions(),
      httpOnly: true,
      maxAge: session.accessMaxAgeMs,
      path: '/',
    });
    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...this.baseCookieOptions(),
      httpOnly: true,
      maxAge: session.refreshMaxAgeMs,
      path: '/',
    });
    response.cookie(CSRF_COOKIE, session.csrfToken, {
      ...this.baseCookieOptions(),
      httpOnly: false,
      maxAge: session.refreshMaxAgeMs,
      path: '/',
    });
  }

  private clearSessionCookies(response: Response): void {
    response.clearCookie(ACCESS_COOKIE, {
      ...this.baseCookieOptions(),
      httpOnly: true,
      path: '/',
    });
    response.clearCookie(REFRESH_COOKIE, {
      ...this.baseCookieOptions(),
      httpOnly: true,
      path: '/',
    });
    response.clearCookie(CSRF_COOKIE, {
      ...this.baseCookieOptions(),
      httpOnly: false,
      path: '/',
    });
  }

  private baseCookieOptions(): CookieOptions {
    const domain = this.config.get<string>('AUTH_COOKIE_DOMAIN') || undefined;
    return {
      domain,
      sameSite: 'lax',
      secure:
        this.config.get<boolean>('AUTH_COOKIE_SECURE') ??
        this.config.get<string>('NODE_ENV') === 'production',
    };
  }

  private requireCsrf(request: Request): string {
    const cookie = readCookie(request, CSRF_COOKIE);
    const headerValue = request.headers['x-csrf-token'];
    const header = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!cookie || !header || !secureEqual(cookie, header)) {
      throw new UnauthorizedException('Invalid request');
    }
    return cookie;
  }
}

function readCookie(request: Request, name: string): string | undefined {
  return (request.cookies as Record<string, string> | undefined)?.[name];
}

function requestContext(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    ipAddress: request.ip,
    userAgent: request.get('user-agent')?.slice(0, 500),
  };
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
