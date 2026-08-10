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
import { UserRole } from '../common/enums';
import {
  assertManagerCompanyAccess,
  resolveCompanyIds,
  resolveWritableCompanyId,
} from '../common/company-scope.util';

@ApiTags('Goods receipts / Factory orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller()
export class GoodsReceiptsController {
  constructor(private readonly service: GoodsReceiptsService) {}

  @Get('goods-receipts')
  @ApiOperation({ summary: 'List goods receipts (prixod)' })
  list(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
    @Query('ox') ox?: string,
  ) {
    const companyIds = resolveCompanyIds(req.user, companyId);
    if (req.user.role === UserRole.MANAGER && (!companyIds || companyIds.length === 0)) {
      return [];
    }
    const oxBool =
      ox === undefined ? undefined : ox === 'true' || ox === '1';
    return this.service.findAll({
      companyId: companyIds ?? null,
      ox: oxBool,
    });
  }

  @Get('goods-receipts/:id')
  @ApiOperation({ summary: 'Get one goods receipt' })
  async one(
    @Request() req: { user: User },
    @Param('id') id: string,
  ) {
    const row = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, row.companyId);
    return row;
  }

  @Post('goods-receipts')
  @ApiOperation({ summary: 'Create goods receipt (admin conduct)' })
  create(
    @Request() req: { user: User },
    @Body() dto: CreateGoodsReceiptDto,
  ) {
    const companyId = resolveWritableCompanyId(req.user, dto.companyId);
    return this.service.create({ ...dto, companyId }, req.user.id);
  }

  @Post('goods-receipts/import')
  @ApiOperation({ summary: 'Import legacy localStorage receipts' })
  import(
    @Request() req: { user: User },
    @Body() dto: ImportGoodsReceiptsDto,
  ) {
    const companyId = resolveWritableCompanyId(req.user, undefined);
    const rows = (dto.rows || []).map((r) => ({
      ...r,
      companyId: resolveWritableCompanyId(req.user, r.companyId) || companyId,
    }));
    return this.service.importMany(rows, req.user.id);
  }

  @Get('factory-reconciliations/stats')
  @ApiOperation({ summary: 'Missing products statistics' })
  stats(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    const companyIds = resolveCompanyIds(req.user, companyId);
    if (req.user.role === UserRole.MANAGER && (!companyIds || companyIds.length === 0)) {
      return [];
    }
    return this.service.stats(companyIds ?? null);
  }

  @Get('factory-reconciliations/by-receipt/:receiptId')
  @ApiOperation({ summary: 'Get reconciliation for a receipt' })
  async getByReceipt(
    @Request() req: { user: User },
    @Param('receiptId') receiptId: string,
  ) {
    const receipt = await this.service.findOne(receiptId);
    assertManagerCompanyAccess(req.user, receipt.companyId);
    return this.service.getReconciliationByReceipt(receiptId);
  }

  @Put('factory-reconciliations/by-receipt/:receiptId')
  @ApiOperation({ summary: 'Save ordered items vs prixod' })
  async upsert(
    @Request() req: { user: User },
    @Param('receiptId') receiptId: string,
    @Body() dto: UpsertFactoryReconciliationDto,
  ) {
    const receipt = await this.service.findOne(receiptId);
    assertManagerCompanyAccess(req.user, receipt.companyId);
    const companyId = resolveWritableCompanyId(req.user, dto.companyId || receipt.companyId);
    return this.service.upsertReconciliation(
      receiptId,
      { ...dto, companyId },
      req.user.id,
    );
  }
}
