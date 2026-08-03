import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LoginDeviceDto {
  @ApiPropertyOptional({ example: 'a1b2c3d4', description: 'Stable device id' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: 'Samsung' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: 'SM-A546E' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 'Android 14' })
  @IsOptional()
  @IsString()
  os?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'agent001' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ type: LoginDeviceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LoginDeviceDto)
  device?: LoginDeviceDto;
}

export class RefreshTokenDto {
  /** Optional when HttpOnly refresh cookie is present (web) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ type: LoginDeviceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LoginDeviceDto)
  device?: LoginDeviceDto;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'agent123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    position?: string | null;
    /** true = dostavkachi (position bo‘yicha); faqat distributor uchun */
    isDelivery?: boolean;
    permissions?: string[] | null;
    distributorId?: string;
    companyName?: string;
    clientId?: string;
    clientName?: string;
  };
}
