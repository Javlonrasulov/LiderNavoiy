import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReconciliationLineItemDto {
  @ApiProperty()
  productName: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  total: number;

  @ApiPropertyOptional()
  unit?: string;
}

export class ReconciliationLineDto {
  @ApiPropertyOptional()
  date?: string;

  @ApiProperty()
  operation: string;

  @ApiPropertyOptional()
  debit?: number | null;

  @ApiPropertyOptional()
  credit?: number | null;

  @ApiProperty({ default: false })
  expandable: boolean;

  @ApiProperty({ default: false })
  isSummary: boolean;

  @ApiProperty({ default: false })
  isOpening: boolean;

  @ApiProperty({ default: false })
  isClosing: boolean;

  @ApiPropertyOptional({ type: [ReconciliationLineItemDto] })
  items?: ReconciliationLineItemDto[];
}

export class ClientReconciliationDto {
  @ApiProperty()
  clientId: string;

  @ApiProperty()
  clientCode: string;

  @ApiProperty()
  clientName: string;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;

  @ApiProperty()
  openingBalance: number;

  @ApiProperty()
  closingBalance: number;

  @ApiProperty()
  totalDebit: number;

  @ApiProperty()
  totalCredit: number;

  @ApiProperty({ type: [ReconciliationLineDto] })
  lines: ReconciliationLineDto[];
}
