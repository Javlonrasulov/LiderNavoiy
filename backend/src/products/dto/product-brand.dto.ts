import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductBrandDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ default: '#6366f1' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  color?: string;

  @ApiPropertyOptional({ description: 'Base64 data URL or image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

export class UpdateProductBrandDto extends PartialType(CreateProductBrandDto) {}
