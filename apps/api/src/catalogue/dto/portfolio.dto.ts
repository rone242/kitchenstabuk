import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePortfolioDto {
  @IsUUID() serviceId: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsUUID() beforeImageId?: string | null;
  @IsOptional() @IsUUID() imageId?: string | null;
  @IsString() @MaxLength(180) titleAr: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class UpdatePortfolioDto extends PartialType(CreatePortfolioDto) {}
