import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateTerminalDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Ichki kod (1C Код)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @ApiPropertyOptional({ description: 'Bank/protsessing ID (1C ИД)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  externalId?: string | null;

  @ApiPropertyOptional({ description: '23510 hisob raqami' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  account23510?: string | null;

  @ApiPropertyOptional({ description: 'company_bank_accounts.id' })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsOptional()
  @IsUUID()
  bankAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string | null;

  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
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
  @MaxLength(64)
  externalId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  account23510?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  bankAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  assignedDistributorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
