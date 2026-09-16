import { Transform, Type } from 'class-transformer';
import {
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
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

export class CreateCategoryDto {
  @IsOptional() @IsString() @MaxLength(320) shortDescriptionEn?: string;
  @IsOptional() @IsString() @MaxLength(30000) descriptionEn?: string;
  @IsOptional() @IsString() @MaxLength(320) seoTitleEn?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescriptionEn?: string;
  @IsString() @MinLength(2) @MaxLength(120) nameAr: string;
  @IsOptional() @IsString() @MaxLength(120) nameEn?: string;
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(120)
  slug: string;
  @IsOptional() @IsString() @MaxLength(240) shortDescription?: string;
  @IsOptional() @IsString() @MaxLength(10_000) description?: string;
  @IsOptional() @IsString() @MaxLength(80) icon?: string;
  @IsOptional() @IsUUID() imageId?: string | null;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  sortOrder?: number;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MaxLength(180) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CategoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;
}
