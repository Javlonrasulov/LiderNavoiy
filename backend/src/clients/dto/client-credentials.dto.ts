import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class SetClientCredentialsDto {
  @ApiProperty({ example: 'client29072' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiPropertyOptional({
    example: 'client123456',
    description: 'Yangi hisobda majburiy; mavjud hisobda berilmasa eski parol saqlanadi',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: 'Mijoz APK ga kira oladimi' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetClientAppLoginActiveDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}
