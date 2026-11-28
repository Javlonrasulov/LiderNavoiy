import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class StartVisitDto {
  @ApiProperty()
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  checkInLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  checkInLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  visitedAt?: string;
}

export class CompleteVisitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'with_order | without_order | cancelled' })
  @IsOptional()
  @IsString()
  outcome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OpenRecordingSessionDto {
  @ApiProperty()
  @IsUUID()
  visitId: string;

  @ApiProperty({ description: 'Mijoz ogohlantirildi va rozilik berdi' })
  @IsBoolean()
  clientConsent: boolean;
}

export class FinishRecordingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60 * 60)
  durationSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  interrupted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcome?: string;
}

export class LinkRecordingOrderDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderTotal?: number;
}
