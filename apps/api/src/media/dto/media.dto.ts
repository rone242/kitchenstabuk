import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class MediaQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 24;
  @IsOptional() @IsString() search?: string;
}

export class UpdateMediaDto {
  @IsOptional() @IsString() @MaxLength(300) altTextAr?: string;
  @IsOptional() @IsString() @MaxLength(300) altTextEn?: string;
}

export class UploadMediaDto extends UpdateMediaDto {}
