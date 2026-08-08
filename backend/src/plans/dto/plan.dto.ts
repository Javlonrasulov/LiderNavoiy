import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PLAN_UNITS = ['som', 'kg', 'ton', 'dona'] as const;
export type PlanUnitDto = (typeof PLAN_UNITS)[number];

export class PlanProductItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsString()
  productName: string;

  @ApiProperty({ description: 'Category key this product belongs to' })
  @IsString()
  categoryKey: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

export class UpsertPlanDto {
  @ApiProperty()
  @IsUUID()
  distributorId: string;

  @ApiPropertyOptional({ enum: ['current', 'next'] })
  @IsOptional()
  @IsString()
  monthType?: 'current' | 'next';

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  total: number;

  @ApiPropertyOptional({ enum: PLAN_UNITS, default: 'som' })
  @IsOptional()
  @IsIn(PLAN_UNITS)
  unit?: PlanUnitDto;

  @ApiProperty({ description: 'Category key -> amount map' })
  @IsObject()
  categories: Record<string, number>;

  @ApiPropertyOptional({ description: 'Category key -> display name map' })
  @IsOptional()
  @IsObject()
  categoryNames?: Record<string, string>;

  @ApiPropertyOptional({ type: [PlanProductItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanProductItemDto)
  products?: PlanProductItemDto[];
}
