import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCashMovementDto {
  @IsString()
  @MaxLength(64)
  companyId: string;

  @IsIn(['income', 'expense'])
  type: 'income' | 'expense';

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  occurredAt: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  categoryPath?: string | null;

  @IsOptional()
  @IsIn(['cash', 'terminal', 'bank', 'other'])
  method?: 'cash' | 'terminal' | 'bank' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  cashbox?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterparty?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class UpdateCashMovementDto {
  @IsOptional()
  @IsIn(['income', 'expense'])
  type?: 'income' | 'expense';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  categoryPath?: string | null;

  @IsOptional()
  @IsIn(['cash', 'terminal', 'bank', 'other'])
  method?: 'cash' | 'terminal' | 'bank' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  cashbox?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  counterparty?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;
}

export class CreateCashCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  companyId?: string | null;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsIn(['income', 'expense', 'both'])
  kind?: 'income' | 'expense' | 'both';

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
