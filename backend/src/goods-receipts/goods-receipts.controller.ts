import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { User } from '../auth/entities/user.entity';
import { GoodsReceiptsService } from './goods-receipts.service';
import {
  CreateGoodsReceiptDto,
  ImportGoodsReceiptsDto,
  UpsertFactoryReconciliationDto,
} from './dto/goods-receipt.dto';

@ApiTags('Goods receipts / Factory orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller()
export class GoodsReceiptsController {
  constructor(private readonly service: GoodsReceiptsService) {}

  @Get('goods-receipts')
  @ApiOperation({ summary: 'List goods receipts (prixod)' })
  list(
    @Query('companyId') companyId?: string,
    @Query('ox') ox?: string,
  ) {
    const oxBool =
      ox === undefined ? undefined : ox === 'true' || ox === '1';
    return this.service.findAll({
      companyId: companyId?.trim() || null,
      ox: oxBool,
    });
  }

  @Get('goods-receipts/:id')
  @ApiOperation({ summary: 'Get one goods receipt' })
  one(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('goods-receipts')
  @ApiOperation({ summary: 'Create goods receipt (admin conduct)' })
  create(
    @Request() req: { user: User },
    @Body() dto: CreateGoodsReceiptDto,
  ) {
    return this.service.create(dto, req.user.id);
  }

  @Post('goods-receipts/import')
  @ApiOperation({ summary: 'Import legacy localStorage receipts' })
  import(
    @Request() req: { user: User },
    @Body() dto: ImportGoodsReceiptsDto,
  ) {
    return this.service.importMany(dto.rows || [], req.user.id);
  }

  @Get('factory-reconciliations/stats')
  @ApiOperation({ summary: 'Missing products statistics' })
  stats(@Query('companyId') companyId?: string) {
    return this.service.stats(companyId?.trim() || null);
  }

  @Get('factory-reconciliations/by-receipt/:receiptId')
  @ApiOperation({ summary: 'Get reconciliation for a receipt' })
  getByReceipt(@Param('receiptId') receiptId: string) {
    return this.service.getReconciliationByReceipt(receiptId);
  }

  @Put('factory-reconciliations/by-receipt/:receiptId')
  @ApiOperation({ summary: 'Save ordered items vs prixod' })
  upsert(
    @Request() req: { user: User },
    @Param('receiptId') receiptId: string,
    @Body() dto: UpsertFactoryReconciliationDto,
  ) {
    return this.service.upsertReconciliation(receiptId, dto, req.user.id);
  }
}
