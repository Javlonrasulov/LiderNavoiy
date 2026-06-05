import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'C001' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 'Ahmad Market' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lineCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  distributorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  territory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientClass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceCategory?: string;
}

export class UpdateClientDto {
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
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lineCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  distributorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  territory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientClass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceCategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
