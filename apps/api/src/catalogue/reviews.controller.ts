import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public, RequirePermissions } from '../auth/auth.decorators.js';
import { PrismaService } from '../database/prisma.service.js';
import { paginationMeta } from '../common/dto/pagination.dto.js';
import {
  ModerateReviewDto,
  ReviewQueryDto,
  SubmitReviewDto,
} from './dto/review.dto.js';

@Controller()
export class ReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('catalogue/reviews')
  async submit(@Body() input: SubmitReviewDto) {
    await this.prisma.client.customerReview.create({
      data: {
        ...input,
        email: input.email.toLowerCase(),
        status: 'PENDING',
        isActive: false,
        isFeatured: false,
      },
    });
    return { status: 'PENDING' };
  }

  @RequirePermissions('content.manage')
  @Get('admin/reviews')
  async list(@Query() query: ReviewQueryDto) {
    const where = query.status ? { status: query.status } : {};
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.customerReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.customerReview.count({ where }),
    ]);
    return { data, meta: paginationMeta(query.page, query.pageSize, total) };
  }

  @RequirePermissions('content.manage')
  @Patch('admin/reviews/:id')
  async moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ModerateReviewDto,
    @Req() request: Request,
  ) {
    return this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.customerReview.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Review not found');
      const review = await tx.customerReview.update({
        where: { id },
        data: { status: input.status, isActive: input.status === 'APPROVED' },
      });
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: `review.${input.status.toLowerCase()}`,
          entityType: 'CustomerReview',
          entityId: id,
        },
      });
      return review;
    });
  }

  @RequirePermissions('content.manage')
  @Delete('admin/reviews/:id')
  @HttpCode(204)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    await this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.customerReview.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Review not found');
      await tx.customerReview.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: request.user!.id,
          action: 'review.deleted',
          entityType: 'CustomerReview',
          entityId: id,
        },
      });
    });
  }
}
