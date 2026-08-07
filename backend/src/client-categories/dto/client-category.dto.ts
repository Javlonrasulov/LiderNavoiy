import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateClientCategoryDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;
}

export interface ClientCategoryItemDto {
  id: string;
  name: string;
  companyId: string | null;
}
