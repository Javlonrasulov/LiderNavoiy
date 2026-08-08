import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PromotionConditionDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.001)
  buyQuantity: number;
}

export class PromotionRewardDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ example: 0, description: '0 = tekin' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

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

  /** @deprecated — conditions ishlatiladi; backward compat */
  @ApiPropertyOptional({
    description: 'Legacy buy qty (conditions bo‘lmasa)',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  buyQuantity?: number;

  /** @deprecated — rewardQuantity */
  @ApiPropertyOptional({
    description: 'Legacy free qty → rewardQuantity',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeQuantity?: number;

  /** @deprecated — conditions[0] */
  @ApiPropertyOptional({ description: 'Legacy shartli mahsulot' })
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @ApiPropertyOptional({ type: [PromotionConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionConditionDto)
  conditions?: PromotionConditionDto[];

  @ApiPropertyOptional({ type: [PromotionRewardDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionRewardDto)
  rewards?: PromotionRewardDto[];

  /** @deprecated — rewards[0] */
  @ApiPropertyOptional({ description: 'Sovg‘a mahsulot ID (legacy)' })
  @IsOptional()
  @IsUUID()
  rewardProductId?: string | null;

  /** @deprecated — rewards[0].quantity */
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardQuantity?: number | null;

  /** @deprecated — rewards[0].price */
  @ApiPropertyOptional({ example: 0, description: 'Aksiya narxi; 0 = tekin' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardPrice?: number | null;

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
