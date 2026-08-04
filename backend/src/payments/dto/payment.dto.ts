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
import { OrderItemDto } from '../../orders/dto/order.dto';

export class DeliverOrderDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  terminalId?: string;

  @ApiPropertyOptional({ description: 'Collected now; default = remaining' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ description: 'ISO datetime for deferred / remaining' })
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({
    description: 'JPEG/PNG as data URL or raw base64 (agent fallback when multipart fails)',
  })
  @IsOptional()
  @IsString()
  photoBase64?: string;
}

export class CollectPaymentDto {
  @ApiProperty({ enum: [PaymentMethod.CASH, PaymentMethod.TERMINAL] })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  terminalId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'New due date for remaining balance' })
  @IsOptional()
  @IsString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({
    description: 'JPEG/PNG as data URL or raw base64 (agent fallback when multipart fails)',
  })
  @IsOptional()
  @IsString()
  photoBase64?: string;
}

export class UpdateDueAtDto {
  @ApiProperty()
  @IsString()
  dueAt: string;
}

export class CreateReturnDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
