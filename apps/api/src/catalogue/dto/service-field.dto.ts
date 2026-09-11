import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ServiceFieldType } from 'database';

export class ServiceFieldOptionDto {
  @IsString() @Matches(/^[a-zA-Z0-9_-]+$/) @MaxLength(80) value: string;
  @IsString() @MinLength(1) @MaxLength(160) labelAr: string;
  @IsOptional() @IsString() @MaxLength(160) labelEn?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateServiceFieldDto {
  @IsString() @Matches(/^[a-z][a-z0-9_]*$/) @MaxLength(80) key: string;
  @IsEnum(ServiceFieldType) type: (typeof ServiceFieldType)[keyof typeof ServiceFieldType];
  @IsString() @MinLength(1) @MaxLength(180) labelAr: string;
  @IsOptional() @IsString() @MaxLength(180) labelEn?: string;
  @IsOptional() @IsString() @MaxLength(500) helpTextAr?: string;
  @IsOptional() @IsString() @MaxLength(500) helpTextEn?: string;
  @IsOptional() @IsString() @MaxLength(240) placeholderAr?: string;
  @IsOptional() @IsString() @MaxLength(240) placeholderEn?: string;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @IsObject() validationRules?: Record<string, unknown>;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ServiceFieldOptionDto) options?: ServiceFieldOptionDto[];
}

export class UpdateServiceFieldDto extends PartialType(CreateServiceFieldDto) {}
