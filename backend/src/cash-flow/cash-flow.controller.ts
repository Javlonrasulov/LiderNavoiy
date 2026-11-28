import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  PermissionsGuard,
  RequirePage,
} from '../common/guards/permissions.guard';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import {
  assertManagerCompanyAccess,
  resolveCompanyIds,
  resolveWritableCompanyId,
} from '../common/company-scope.util';
import { CashFlowService } from './cash-flow.service';
import { CashMovement } from './entities/cash-movement.entity';
import {
  CreateCashCategoryDto,
  CreateCashMovementDto,
  UpdateCashMovementDto,
} from './dto/cash-flow.dto';

@ApiTags('Cash flow / Kirim-chiqim')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePage('kirimChiqim')
@Controller('cash-flow')
export class CashFlowController {
  constructor(
    private readonly service: CashFlowService,
    @InjectRepository(CashMovement)
    private readonly movementRepo: Repository<CashMovement>,
  ) {}

  private companyIds(user: User, companyId?: string | string[]) {
    const ids = resolveCompanyIds(user, companyId);
    if (user.role === UserRole.MANAGER && (!ids || ids.length === 0)) {
      return [] as string[];
    }
    return ids ?? null;
  }

  @Get('summary')
  @ApiOperation({ summary: 'Umumiy KPI + grafik' })
  summary(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.summary({
      companyIds: this.companyIds(req.user, companyId),
      from,
      to,
    });
  }

  @Get('movements')
  @ApiOperation({ summary: 'Pul harakati ro‘yxati' })
  movements(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: 'income' | 'expense' | 'all',
    @Query('categoryId') categoryId?: string,
    @Query('categoryPath') categoryPath?: string,
    @Query('method') method?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listMovements({
      companyIds: this.companyIds(req.user, companyId),
      from,
      to,
      type,
      categoryId,
      categoryPath,
      method,
      search,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
    });
  }

  @Get('groups')
  @ApiOperation({ summary: 'Guruhlar bo‘yicha pul harakati' })
  groups(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: 'income' | 'expense' | 'all',
    @Query('categoryPath') categoryPath?: string,
    @Query('search') search?: string,
  ) {
    return this.service.groups({
      companyIds: this.companyIds(req.user, companyId),
      from,
      to,
      type: type ?? 'expense',
      categoryPath,
      search,
    });
  }

  @Get('sales-profit')
  @ApiOperation({ summary: 'Sotuv foydasi' })
  salesProfit(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('productId') productId?: string,
    @Query('productCategory') productCategory?: string,
    @Query('agentId') agentId?: string,
    @Query('sort') sort?: string,
  ) {
    return this.service.salesProfit({
      companyIds: this.companyIds(req.user, companyId),
      from,
      to,
      productId,
      productCategory,
      agentId,
      sort,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Kategoriyalar' })
  categories(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
  ) {
    return this.service.listCategories(this.companyIds(req.user, companyId));
  }

  @Post('categories')
  @ApiOperation({ summary: 'Kategoriya yaratish' })
  createCategory(
    @Request() req: { user: User },
    @Body() dto: CreateCashCategoryDto,
  ) {
    const companyId = resolveWritableCompanyId(req.user, dto.companyId);
    return this.service.createCategory({ ...dto, companyId });
  }

  @Post('movements')
  @ApiOperation({ summary: 'Kirim/chiqim qo‘shish' })
  createMovement(
    @Request() req: { user: User },
    @Body() dto: CreateCashMovementDto,
  ) {
    const companyId = resolveWritableCompanyId(req.user, dto.companyId);
    if (!companyId) throw new BadRequestException('companyId required');
    return this.service.createMovement(
      { ...dto, companyId },
      req.user.id,
      req.user.fullName || req.user.username,
    );
  }

  @Patch('movements/:id')
  @ApiOperation({ summary: 'Operatsiyani tahrirlash' })
  async updateMovement(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateCashMovementDto,
  ) {
    const existing = await this.movementRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!existing) throw new BadRequestException('Movement not found');
    assertManagerCompanyAccess(req.user, existing.companyId);
    return this.service.updateMovement(id, dto);
  }

  @Delete('movements/:id')
  @ApiOperation({ summary: 'Operatsiyani o‘chirish' })
  async deleteMovement(
    @Request() req: { user: User },
    @Param('id') id: string,
  ) {
    const existing = await this.movementRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!existing) throw new BadRequestException('Movement not found');
    assertManagerCompanyAccess(req.user, existing.companyId);
    return this.service.deleteMovement(id);
  }
}
