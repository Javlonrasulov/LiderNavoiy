import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

const visitDaysProp = {
  example: [1, 3, 5],
  description: '1=Mon … 7=Sun',
};

export class CreateLineDto {
  @ApiProperty({ example: '01' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 'Toshrabot - Xazora - Air' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: 'Alisher' })
  @IsOptional()
  @IsString()
  agentName?: string;

  @ApiPropertyOptional({ example: 'Dilshod' })
  @IsOptional()
  @IsString()
  deliveryName?: string;

  @ApiPropertyOptional(visitDaysProp)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  agentVisitDays?: number[];

  @ApiPropertyOptional(visitDaysProp)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  deliveryVisitDays?: number[];

  /** @deprecated — agentVisitDays ga yoziladi */
  @ApiPropertyOptional(visitDaysProp)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  visitDays?: number[];
}

export class UpdateLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryName?: string | null;

  @ApiPropertyOptional(visitDaysProp)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  agentVisitDays?: number[] | null;

  @ApiPropertyOptional(visitDaysProp)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  deliveryVisitDays?: number[] | null;

  /** @deprecated */
  @ApiPropertyOptional(visitDaysProp)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  visitDays?: number[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export interface LineListItemDto {
  id: string;
  code: string;
  name: string;
  agentName: string | null;
  deliveryName: string | null;
  agentVisitDays: number[];
  deliveryVisitDays: number[];
  /** Agent kunlari (eski klientlar uchun) */
  visitDays: number[];
  clientCount: number;
  companyId: string | null;
}
