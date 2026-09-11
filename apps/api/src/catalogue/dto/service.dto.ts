import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PriceType } from 'database';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class CreateServiceDto {
  @IsUUID() categoryId: string;
  @IsString() @MinLength(2) @MaxLength(140) nameAr: string;
  @IsOptional() @IsString() @MaxLength(140) nameEn?: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(140) slug: string;
  @IsString() @MinLength(10) @MaxLength(500) summary: string;
  @IsString() @MinLength(20) @MaxLength(30_000) description: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) benefits?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) processSteps?: string[];
  @IsOptional() @IsEnum(PriceType) priceType?: (typeof PriceType)[keyof typeof PriceType];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) startingPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maximumPrice?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsString() @MaxLength(100) durationText?: string;
  @IsOptional() @IsUUID() coverImageId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsUUID('4', { each: true }) galleryIds?: string[];
  @IsOptional() @IsBoolean() isEmergency?: boolean;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100_000) sortOrder?: number;
  @IsOptional() @IsString() @MaxLength(180) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}

export class ServiceQueryDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;
}
