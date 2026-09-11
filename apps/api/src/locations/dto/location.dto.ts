import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

class BaseLocationDto {
  @IsString() @MinLength(2) @MaxLength(140) nameAr: string;
  @IsOptional() @IsString() @MaxLength(140) nameEn?: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(140) slug: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100_000) sortOrder?: number;
  @IsOptional() @IsString() @MaxLength(180) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;
}

export class CreateRegionDto extends BaseLocationDto {
  @IsOptional() @IsUUID() countryId?: string;
}
export class UpdateRegionDto extends PartialType(CreateRegionDto) {}

export class CreateCityDto extends BaseLocationDto {
  @IsUUID() regionId: string;
  @IsOptional() @IsString() @MaxLength(500) shortDescription?: string;
}
export class UpdateCityDto extends PartialType(CreateCityDto) {}

export class CreateDistrictDto extends BaseLocationDto {
  @IsUUID() cityId: string;
}
export class UpdateDistrictDto extends PartialType(CreateDistrictDto) {}

export class LocationQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() parentId?: string;
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;
}

export class ServiceLocationItemDto {
  @IsUUID() cityId: string;
  @IsOptional() @IsUUID() districtId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MaxLength(5_000) localIntroduction?: string;
  @IsOptional() @IsString() @MaxLength(500) localPricingText?: string;
  @IsOptional() @IsString() @MaxLength(180) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;
}

export class ReplaceServiceLocationsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ServiceLocationItemDto)
  locations: ServiceLocationItemDto[];
}
