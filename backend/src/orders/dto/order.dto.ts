import { IsUUID, IsArray, ValidateNested, IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../common/enums';

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  productCode: string;

  @ApiProperty()
  @IsString()
  productName: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsString()
  unit: string;

  @ApiPropertyOptional({ description: 'Aksiya (bepul) bo‘lsa true' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Qaysi promo qoidasidan kelgani' })
  @IsOptional()
  @IsString()
  promotionId?: string;

  @ApiPropertyOptional({ description: 'Tarozi haqiqiy miqdor (ves)' })
  @IsOptional()
  @IsNumber()
  actualQuantity?: number | null;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  visitId?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  offlineId?: string;
}

/** Admin/manager: agent o‘rniga buyurtma yaratish */
export class AdminCreateOrderDto extends CreateOrderDto {
  @ApiProperty({ description: 'Agent (distributor) profile id' })
  @IsUUID()
  distributorId: string;
}

export class BatchOrdersDto {
  @ApiProperty({ type: [CreateOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDto)
  orders: CreateOrderDto[];
}

export class PackageCountsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  xalta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quti?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  paket?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mayda?: number;
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deliveryDistributorId?: string | null;

  /** Tarozi: itemlar uchun actualQuantity yozish */
  @ApiPropertyOptional({ type: [OrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];

  /** Tarozi: xalta / quti / paket / mayda qop */
  @ApiPropertyOptional({ type: PackageCountsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PackageCountsDto)
  packageCounts?: PackageCountsDto;
}

export class ReorderDeliveryDto {
  @ApiProperty({ type: [String], description: 'on_way order IDs in desired stop order' })
  @IsArray()
  @IsUUID('4', { each: true })
  orderIds: string[];
}

export class SendToWarehouseDto {
  @ApiPropertyOptional({ description: 'Shoshilinch (urgent) flag for warehouse / admin / tarozi' })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

export class UpdateOrderItemsDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
