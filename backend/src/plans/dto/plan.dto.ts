import { IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ description: 'Category key -> amount map' })
  @IsObject()
  categories: Record<string, number>;

  @ApiPropertyOptional({ description: 'Category key -> display name map' })
  @IsOptional()
  @IsObject()
  categoryNames?: Record<string, string>;
}
