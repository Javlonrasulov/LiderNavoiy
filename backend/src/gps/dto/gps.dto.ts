import {
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LocationPointDto {
  @ApiProperty({ example: 40.1039 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 65.3683 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ example: 15.0 })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bearing?: number;

  @ApiProperty({ example: '2026-05-29T10:30:00.000Z' })
  @IsDateString()
  recordedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class BatchLocationDto {
  @ApiProperty({ type: [LocationPointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  points: LocationPointDto[];
}

export class RouteHistoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: '2026-05-29' })
  @IsOptional()
  @IsString()
  date?: string;
}

export class NearbyClientsQueryDto {
  @ApiProperty({ example: 40.1039 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 65.3683 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 500, description: 'Radius in meters' })
  @IsOptional()
  @IsNumber()
  radiusMeters?: number;
}
