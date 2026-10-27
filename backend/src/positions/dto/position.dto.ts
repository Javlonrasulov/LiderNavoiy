import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  POSITION_APP_ACCESS,
  type PositionAppAccess,
} from '../entities/staff-position.entity';

export class CreatePositionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  code?: number;

  @ApiProperty({ example: 'Savdo agenti' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'agent', enum: POSITION_APP_ACCESS })
  @IsIn(POSITION_APP_ACCESS)
  appAccess: PositionAppAccess;
}

export class UpdatePositionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  code?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ enum: POSITION_APP_ACCESS })
  @IsOptional()
  @IsIn(POSITION_APP_ACCESS)
  appAccess?: PositionAppAccess;

  @ApiPropertyOptional()
  @IsOptional()
  isActive?: boolean;
}

export class PositionDto {
  id: string;
  code: number;
  name: string;
  appAccess: PositionAppAccess;
  isActive: boolean;
}
