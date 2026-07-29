import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Yozgi chegirma' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Coca Colaga 20% chegirma' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Buy X miqdor (10 kg yoki 10 dona). Promo free qoidasi uchun',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  buyQuantity?: number;

  @ApiPropertyOptional({
    description: 'Get Y miqdor (1 kg yoki 1 dona). Promo free qoidasi uchun',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeQuantity?: number;

  @ApiPropertyOptional({ description: 'Mahsulot ID (ixtiyoriy)' })
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @ApiPropertyOptional({ example: '#4F46E5' })
  @IsOptional()
  @IsString()
  colorStart?: string;

  @ApiPropertyOptional({ example: '#9333EA' })
  @IsOptional()
  @IsString()
  colorEnd?: string;

  @ApiPropertyOptional({ example: '🎁' })
  @IsOptional()
  @IsString()
  emoji?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}
