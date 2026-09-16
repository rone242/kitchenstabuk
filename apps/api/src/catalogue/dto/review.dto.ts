import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export class SubmitReviewDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  customerName: string;
  @Transform(trim) @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) cityName?: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @Transform(trim) @IsString() @MinLength(10) @MaxLength(2000) body: string;
}
export class ModerateReviewDto {
  @IsIn(['PENDING', 'APPROVED', 'REJECTED']) status:
    'PENDING' | 'APPROVED' | 'REJECTED';
}
export class ReviewQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(['PENDING', 'APPROVED', 'REJECTED']) status?: string;
}
