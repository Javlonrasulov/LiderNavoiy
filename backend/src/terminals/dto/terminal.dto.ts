import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTerminalDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedDistributorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTerminalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedDistributorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
