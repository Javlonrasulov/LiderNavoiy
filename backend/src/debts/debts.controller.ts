import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { User } from '../auth/entities/user.entity';
import { DebtsService, type DebtAgePreset, type DebtSort } from './debts.service';

function parseCompanyIds(
  companyId: string | string[] | undefined,
  user: User,
): string[] | undefined {
  const raw = companyId == null ? [] : Array.isArray(companyId) ? companyId : [companyId];
  const fromQuery = raw.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);

  if (user.role === 'manager') {
    const profile = user.distributorProfile;
    const allowed = [
      ...new Set(
        [
          ...(Array.isArray(profile?.companyIds) ? profile.companyIds : []),
          profile?.companyId,
        ]
          .map((id) => id?.trim())
          .filter((id): id is string => !!id),
      ),
    ];
    if (!allowed.length) return [];
    return fromQuery.length ? fromQuery.filter((id) => allowed.includes(id)) : allowed;
  }

  return fromQuery.length ? fromQuery : undefined;
}

@ApiTags('Debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard: ochiq qarz jami + 30+ kun xavf' })
  getSummary(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
  ) {
    return this.service.getDebtSummary(parseCompanyIds(companyId, req.user));
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Qarzdorlar filtri: filial va xodimlar' })
  getFilterOptions(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
  ) {
    return this.service.getFilterOptions(parseCompanyIds(companyId, req.user));
  }

  @Get('debtors')
  @ApiOperation({ summary: 'Qarzdor mijozlar ro‘yxati (filtr + pagination)' })
  listDebtors(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
    @Query('agePreset') agePreset?: DebtAgePreset,
    @Query('minAgeDays') minAgeDays?: string,
    @Query('maxAgeDays') maxAgeDays?: string,
    @Query('search') search?: string,
    @Query('employeeId') employeeId?: string,
    @Query('branchId') branchId?: string,
    @Query('debtDateFrom') debtDateFrom?: string,
    @Query('debtDateTo') debtDateTo?: string,
    @Query('minRemaining') minRemaining?: string,
    @Query('maxRemaining') maxRemaining?: string,
    @Query('sort') sort?: DebtSort,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listDebtors({
      companyIds: parseCompanyIds(companyId, req.user),
      agePreset: agePreset ?? 'all',
      minAgeDays: minAgeDays != null ? Number(minAgeDays) : undefined,
      maxAgeDays: maxAgeDays != null ? Number(maxAgeDays) : undefined,
      search,
      employeeId,
      companyId: branchId,
      debtDateFrom,
      debtDateTo,
      minRemaining: minRemaining != null ? Number(minRemaining) : undefined,
      maxRemaining: maxRemaining != null ? Number(maxRemaining) : undefined,
      sort: sort ?? 'oldest',
      page: page != null ? Number(page) : 1,
      pageSize: pageSize != null ? Number(pageSize) : 30,
    });
  }

  @Get('clients/:clientId')
  @ApiOperation({ summary: 'Mijoz qarz tafsiloti' })
  getClientDetail(
    @Request() req: { user: User },
    @Param('clientId') clientId: string,
    @Query('companyId') companyId?: string | string[],
    @Query('agePreset') agePreset?: DebtAgePreset,
  ) {
    return this.service.getClientDebtDetail(
      clientId,
      parseCompanyIds(companyId, req.user),
      agePreset ?? 'all',
    );
  }
}
