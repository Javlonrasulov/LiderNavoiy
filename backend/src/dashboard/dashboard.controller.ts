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
  getAdminDashboard(@Query('companyId') companyId?: string | string[]) {
    const raw = companyId == null ? [] : Array.isArray(companyId) ? companyId : [companyId];
    const companyIds = raw.flatMap(v => v.split(',')).map(v => v.trim()).filter(Boolean);
    return this.service.getAdminDashboard(companyIds.length ? companyIds : undefined);
  }
}
