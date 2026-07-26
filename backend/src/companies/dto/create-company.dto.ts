import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const PRODUCT_TYPES = ['kg_dona', 'dona', 'kg'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export class CreateCompanyDto {
  @ApiProperty({ example: 'Yangi tashkilot' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string;

  @ApiPropertyOptional({ example: '🏢' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @ApiPropertyOptional({ example: 'from-indigo-500 to-blue-600' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: PRODUCT_TYPES, default: 'kg_dona' })
  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  productType?: ProductType;
}
