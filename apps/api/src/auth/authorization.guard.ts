import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY, ROLES_KEY } from './auth.constants.js';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permissions?.length && !roles?.length) return true;

    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) throw new ForbiddenException('Insufficient permissions');

    const hasPermissions =
      !permissions?.length ||
      permissions.every((permission) => user.permissions.includes(permission));
    const hasRole = !roles?.length || roles.some((role) => user.roles.includes(role));
    if (!hasPermissions || !hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
