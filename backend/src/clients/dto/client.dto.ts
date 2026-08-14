import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const MARK_COLORS = ['green', 'yellow', 'red'] as const;

export class ClientExtraPhoneDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @MinLength(1)
  phone: string;

  @ApiPropertyOptional({ example: 'Direktor' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateClientDto {
  @ApiPropertyOptional({ example: '2001' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: "Mijoz kodi faqat raqam bo'lishi kerak" })
  code?: string;

  @ApiPropertyOptional({ example: '174912345678901234' })
  @IsOptional()
  @IsString()
  onTradeId?: string;

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

  @ApiPropertyOptional({ type: [ClientExtraPhoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientExtraPhoneDto)
  extraPhones?: ClientExtraPhoneDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Mijoz ko‘rinadigan tashkilotlar (birinchi = asosiy companyId)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companyIds?: string[];

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

  @ApiPropertyOptional({ description: 'Agent buyurtma olish radiusi (metr)' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  orderRadiusMeters?: number;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ enum: ['green', 'yellow', 'red'] })
  @IsOptional()
  @IsIn(MARK_COLORS)
  markColor?: string | null;

  @ApiPropertyOptional({ description: 'Ishlaydi / ishlamaydi' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Mijoz APK da aksiyalarni ko‘rishi mumkinmi',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  canSeePromotions?: boolean;

  @ApiPropertyOptional({ example: 'sherinmarket' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  appUsername?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  appPassword?: string;

  @ApiPropertyOptional({
    description: 'Mijoz ilovaga kira oladimi (default: yo‘q)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  appLoginActive?: boolean;
}

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Mijoz ko‘rinadigan tashkilotlar (birinchi = asosiy companyId)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companyIds?: string[];

  @ApiPropertyOptional({ example: '2001' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(/^\d+$/, { message: "Mijoz kodi faqat raqam bo'lishi kerak" })
  code?: string;

  @ApiPropertyOptional({ example: '174912345678901234' })
  @IsOptional()
  @IsString()
  onTradeId?: string;

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

  @ApiPropertyOptional({ type: [ClientExtraPhoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientExtraPhoneDto)
  extraPhones?: ClientExtraPhoneDto[];

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

  @ApiPropertyOptional({ description: 'Agent buyurtma olish radiusi (metr)' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  orderRadiusMeters?: number;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ enum: ['green', 'yellow', 'red'] })
  @IsOptional()
  @IsIn(MARK_COLORS)
  markColor?: string | null;

  @ApiPropertyOptional({ description: 'Mijoz APK da aksiyalarni ko‘rishi mumkinmi' })
  @IsOptional()
  @IsBoolean()
  canSeePromotions?: boolean;

  @ApiPropertyOptional({ example: 'sherinmarket' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  appUsername?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  appPassword?: string;

  @ApiPropertyOptional({ description: 'Mijoz ilovaga kira oladimi' })
  @IsOptional()
  @IsBoolean()
  appLoginActive?: boolean;
}

export class TransferClientsDto {
  @ApiProperty({ description: 'Target organization id' })
  @IsString()
  @MinLength(1)
  targetCompanyId: string;

  @ApiPropertyOptional({ description: 'Source organization (required when transferAll=true)' })
  @IsOptional()
  @IsString()
  sourceCompanyId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Specific client IDs to transfer' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  clientIds?: string[];

  @ApiPropertyOptional({ description: 'Transfer all clients from sourceCompanyId' })
  @IsOptional()
  @IsBoolean()
  transferAll?: boolean;
}
