import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/auth.decorators.js';
import { CatalogueService } from './catalogue.service.js';
import {
  CategoryQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto.js';
import {
  CreateServiceDto,
  ServiceQueryDto,
  UpdateServiceDto,
} from './dto/service.dto.js';
import {
  CreateServiceFieldDto,
  UpdateServiceFieldDto,
} from './dto/service-field.dto.js';
import { CreatePortfolioDto, UpdatePortfolioDto } from './dto/portfolio.dto.js';

@Controller('admin')
export class CatalogueController {
  constructor(private readonly catalogue: CatalogueService) {}

  @RequirePermissions('content.manage')
  @Get('portfolio')
  portfolio() {
    return this.catalogue.portfolio();
  }

  @RequirePermissions('content.manage')
  @Post('portfolio')
  createPortfolio(@Body() input: CreatePortfolioDto, @Req() request: Request) {
    return this.catalogue.createPortfolio(input, mutationContext(request));
  }

  @RequirePermissions('content.manage')
  @Patch('portfolio/:id')
  updatePortfolio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdatePortfolioDto,
    @Req() request: Request,
  ) {
    return this.catalogue.updatePortfolio(id, input, mutationContext(request));
  }

  @RequirePermissions('category.read')
  @Get('categories')
  categories(@Query() query: CategoryQueryDto) {
    return this.catalogue.categories(query);
  }

  @RequirePermissions('category.read')
  @Get('categories/:id')
  category(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogue.category(id);
  }

  @RequirePermissions('category.create')
  @Post('categories')
  createCategory(@Body() input: CreateCategoryDto, @Req() request: Request) {
    return this.catalogue.createCategory(input, mutationContext(request));
  }

  @RequirePermissions('category.update')
  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateCategoryDto,
    @Req() request: Request,
  ) {
    return this.catalogue.updateCategory(id, input, mutationContext(request));
  }

  @RequirePermissions('category.delete')
  @Delete('categories/:id')
  deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.catalogue.deleteCategory(id, mutationContext(request));
  }

  @RequirePermissions('service.read')
  @Get('services')
  services(@Query() query: ServiceQueryDto) {
    return this.catalogue.services(query);
  }

  @RequirePermissions('service.read')
  @Get('services/:id')
  service(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogue.service(id);
  }

  @RequirePermissions('service.create')
  @Post('services')
  createService(@Body() input: CreateServiceDto, @Req() request: Request) {
    return this.catalogue.createService(input, mutationContext(request));
  }

  @RequirePermissions('service.update')
  @Patch('services/:id')
  updateService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateServiceDto,
    @Req() request: Request,
  ) {
    return this.catalogue.updateService(id, input, mutationContext(request));
  }

  @RequirePermissions('service.delete')
  @Delete('services/:id')
  deleteService(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.catalogue.deleteService(id, mutationContext(request));
  }

  @RequirePermissions('service.read')
  @Get('services/:serviceId/fields')
  fields(@Param('serviceId', ParseUUIDPipe) serviceId: string) {
    return this.catalogue.fields(serviceId);
  }

  @RequirePermissions('service.update')
  @Post('services/:serviceId/fields')
  createField(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() input: CreateServiceFieldDto,
    @Req() request: Request,
  ) {
    return this.catalogue.createField(
      serviceId,
      input,
      mutationContext(request),
    );
  }

  @RequirePermissions('service.update')
  @Patch('services/:serviceId/fields/:fieldId')
  updateField(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Body() input: UpdateServiceFieldDto,
    @Req() request: Request,
  ) {
    return this.catalogue.updateField(
      serviceId,
      fieldId,
      input,
      mutationContext(request),
    );
  }

  @RequirePermissions('service.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('services/:serviceId/fields/:fieldId')
  async deleteField(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.catalogue.deleteField(
      serviceId,
      fieldId,
      mutationContext(request),
    );
  }
}

function mutationContext(request: Request) {
  return {
    actorId: request.user!.id,
    ipAddress: request.ip,
    userAgent: request.get('user-agent')?.slice(0, 500),
  };
}
