import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermissions } from '../auth/auth.decorators.js';
import {
  CreateCityDto,
  CreateDistrictDto,
  CreateRegionDto,
  LocationQueryDto,
  ReplaceServiceLocationsDto,
  UpdateCityDto,
  UpdateDistrictDto,
  UpdateRegionDto,
} from './dto/location.dto.js';
import { LocationsService } from './locations.service.js';

@RequirePermissions('location.manage')
@Controller('admin/locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('options') options() { return this.locations.options(); }
  @Get('regions') regions(@Query() query: LocationQueryDto) { return this.locations.regions(query); }
  @Post('regions') createRegion(@Body() input: CreateRegionDto, @Req() request: Request) { return this.locations.createRegion(input, context(request)); }
  @Patch('regions/:id') updateRegion(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateRegionDto, @Req() request: Request) { return this.locations.updateRegion(id, input, context(request)); }
  @Delete('regions/:id') deactivateRegion(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) { return this.locations.deactivateRegion(id, context(request)); }

  @Get('cities') cities(@Query() query: LocationQueryDto) { return this.locations.cities(query); }
  @Post('cities') createCity(@Body() input: CreateCityDto, @Req() request: Request) { return this.locations.createCity(input, context(request)); }
  @Patch('cities/:id') updateCity(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateCityDto, @Req() request: Request) { return this.locations.updateCity(id, input, context(request)); }
  @Delete('cities/:id') deactivateCity(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) { return this.locations.deactivateCity(id, context(request)); }

  @Get('districts') districts(@Query() query: LocationQueryDto) { return this.locations.districts(query); }
  @Post('districts') createDistrict(@Body() input: CreateDistrictDto, @Req() request: Request) { return this.locations.createDistrict(input, context(request)); }
  @Patch('districts/:id') updateDistrict(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateDistrictDto, @Req() request: Request) { return this.locations.updateDistrict(id, input, context(request)); }
  @Delete('districts/:id') deactivateDistrict(@Param('id', ParseUUIDPipe) id: string, @Req() request: Request) { return this.locations.deactivateDistrict(id, context(request)); }

  @Get('services/:serviceId') serviceLocations(@Param('serviceId', ParseUUIDPipe) serviceId: string) { return this.locations.serviceLocations(serviceId); }
  @Put('services/:serviceId') replaceServiceLocations(@Param('serviceId', ParseUUIDPipe) serviceId: string, @Body() input: ReplaceServiceLocationsDto, @Req() request: Request) { return this.locations.replaceServiceLocations(serviceId, input, context(request)); }
}

function context(request: Request) {
  return { actorId: request.user!.id, ipAddress: request.ip, userAgent: request.get('user-agent')?.slice(0, 500) };
}
