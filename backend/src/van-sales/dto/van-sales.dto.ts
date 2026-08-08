import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '../../common/enums';

export class VanLoadItemInputDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  quantity: number;
}

export class CreateVanLoadDto {
  @ApiProperty()
  @IsUUID()
  distributorId: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @IsString()
  loadDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [VanLoadItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VanLoadItemInputDto)
  items: VanLoadItemInputDto[];
}

export class VanSellItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}

export class VanSellDto {
  @ApiProperty()
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  loadId?: string;

  @ApiProperty({ type: [VanSellItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VanSellItemDto)
  items: VanSellItemDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  terminalId?: string;

  @ApiPropertyOptional({ description: 'Collected now; default = full / 0 for deferred' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoBase64?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  offlineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  visitId?: string;
}

export class VanReturnItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;
}

export class SubmitVanReturnDto {
  @ApiPropertyOptional({ type: [VanReturnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VanReturnItemDto)
  items?: VanReturnItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  submittedCash?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AcceptVanReturnDto {
  @ApiPropertyOptional({ type: [VanReturnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VanReturnItemDto)
  items?: VanReturnItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  submittedCash?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
