import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GoodsReceiptItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  tovar: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  artikul?: string;

  @ApiProperty()
  @IsNumber()
  kolFakt: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  kolBrak?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  upakovka?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tsenaPost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  skid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  tsenaPriv?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  summa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ves?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateGoodsReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Legacy localStorage numeric id' })
  @IsOptional()
  legacyId?: string | number;

  @ApiProperty()
  @IsString()
  date: string;

  @ApiProperty()
  @IsString()
  num: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ox?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  org?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warehouse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wagon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dir?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sum?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  netto?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  authorId?: string;

  @ApiProperty({ type: [GoodsReceiptItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items: GoodsReceiptItemDto[];
}

export class ImportGoodsReceiptsDto {
  @ApiProperty({ type: [CreateGoodsReceiptDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptDto)
  rows: CreateGoodsReceiptDto[];
}

export class FactoryOrderItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  artikul?: string;

  @ApiProperty()
  @IsNumber()
  orderedQty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderedUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderedPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderedSum?: number;
}

export class UpsertFactoryReconciliationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ enum: ['draft', 'done'] })
  @IsOptional()
  @IsString()
  status?: 'draft' | 'done';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [FactoryOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FactoryOrderItemDto)
  items: FactoryOrderItemDto[];
}
