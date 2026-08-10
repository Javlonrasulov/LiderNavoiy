import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { User } from '../auth/entities/user.entity';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Agent dashboard statistics' })
  getStats(@Request() req: { user: User }) {
    return this.service.getAgentStats(req.user.distributorProfile!.id);
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin dashboard: KPI, categories, top agents, employee map' })
  getAdminDashboard(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string | string[],
  ) {
    const raw = companyId == null ? [] : Array.isArray(companyId) ? companyId : [companyId];
    const fromQuery = raw.flatMap(v => v.split(',')).map(v => v.trim()).filter(Boolean);

    const user = req.user;
    let companyIds: string[] | undefined = fromQuery.length ? fromQuery : undefined;

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
      if (!allowed.length) {
        return this.service.getAdminDashboard([]);
      }
      companyIds = fromQuery.length
        ? fromQuery.filter((id) => allowed.includes(id))
        : allowed;
      if (!companyIds.length) {
        return this.service.getAdminDashboard([]);
      }
    }

    return this.service.getAdminDashboard(companyIds);
  }
}
