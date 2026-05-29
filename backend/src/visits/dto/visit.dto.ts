import { IsUUID, IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVisitDto {
  @ApiProperty()
  @IsUUID()
  clientId: string;

  @ApiProperty()
  @IsDateString()
  visitedAt: string;

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
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderTotal?: number;
}

export class BatchSyncDto {
  @ApiProperty({ type: [CreateVisitDto] })
  visits: CreateVisitDto[];
}
