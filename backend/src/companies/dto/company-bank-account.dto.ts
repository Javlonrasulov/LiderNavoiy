import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyBankAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: '20 xonali hisob raqami' })
  @IsString()
  @Matches(/^\d{20}$/, { message: 'Hisob raqami 20 xonali raqam bo‘lishi kerak' })
  accountNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankName?: string | null;

  @ApiPropertyOptional({ description: '5 xonali MFO (matn)' })
  @IsOptional()
  @IsString()
  @Matches(/^(\d{5})?$/, { message: 'MFO 5 xonali raqam bo‘lishi kerak' })
  mfo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === 'true' || value === 1 || value === '1';
  })
  isPrimary?: boolean;
}

export class UpdateCompanyBankAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{20}$/, { message: 'Hisob raqami 20 xonali raqam bo‘lishi kerak' })
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^(\d{5})?$/, { message: 'MFO 5 xonali raqam bo‘lishi kerak' })
  mfo?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === 'true' || value === 1 || value === '1';
  })
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === 'true' || value === 1 || value === '1';
  })
  isActive?: boolean;
}
