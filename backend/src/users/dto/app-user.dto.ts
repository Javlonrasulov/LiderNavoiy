import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums';

export class CreateAppUserDto {
  @ApiProperty({ example: 'javlon' })
  @IsString()
  @MinLength(2)
  username: string;

  @ApiProperty({ example: 'parol123' })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiProperty({ example: 'Javlonbek Abdurasulov' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.DISTRIBUTOR })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'OOO "BORAN LEADERS"' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'boran' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;
}

export class UpdateAppUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  username?: string;

  @ApiPropertyOptional({ description: 'Leave empty to keep current password' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;
}

export class AppUserResponseDto {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  position?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  isOnline?: boolean;
  lastDeviceBrand?: string | null;
  lastDeviceModel?: string | null;
  lastDeviceOs?: string | null;
  devices?: Array<{
    brand: string | null;
    model: string | null;
    os: string | null;
    lastLoginAt: string;
  }>;
}
