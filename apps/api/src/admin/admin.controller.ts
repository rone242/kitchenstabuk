import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../auth/auth.decorators.js';
import { PrismaService } from '../database/prisma.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermissions('users.manage')
  @Get('users')
  async users() {
    return this.prisma.client.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        roles: { select: { role: { select: { name: true, nameAr: true } } } },
      },
    });
  }

  @RequirePermissions('users.manage')
  @Get('roles')
  async roles() {
    return this.prisma.client.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { users: true } },
      },
    });
  }

  @RequirePermissions('audit.read')
  @Get('audit-logs')
  async auditLogs() {
    return this.prisma.client.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
