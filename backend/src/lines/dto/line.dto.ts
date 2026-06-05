import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLineDto {
  @ApiProperty({ example: '01' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 'Toshrabot - Xazora - Air' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: 'Alisher' })
  @IsOptional()
  @IsString()
  agentName?: string;
}

export class UpdateLineDto {
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
  agentName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export interface LineListItemDto {
  id: string;
  code: string;
  name: string;
  agentName: string | null;
  clientCount: number;
  companyId: string | null;
}
