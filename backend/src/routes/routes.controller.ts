import { Controller, Get, Param, Query, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { assertManagerCompanyAccess, resolveCompanyIds } from '../common/company-scope.util';
import { AgentTrackingService } from './agent-tracking.service';
import { UserRole } from '../common/enums';

@ApiTags('Route History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(
    private readonly service: RoutesService,
    private readonly tracking: AgentTrackingService,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
  ) {}

  private async assertAccess(user: User, distributorId: string) {
    const profile = await this.profileRepo.findOne({ where: { id: distributorId } });
    assertManagerCompanyAccess(user, profile?.companyId);
  }

  @Get(':distributorId/tracking')
  @ApiOperation({ summary: 'Daily planned shops, verified visits, order sources and GPS track (Asia/Tashkent)' })
  async getTracking(@Request() req: { user: User }, @Param('distributorId') distributorId: string, @Query('date') date: string, @Query('companyId') companyId?: string) {
    const user = req.user;
    const profile = await this.profileRepo.findOne({ where: { id: distributorId } });
    if (!profile) throw new NotFoundException('Agent topilmadi');
    if (user.role === UserRole.CLIENT || (user.role === UserRole.DISTRIBUTOR && user.distributorProfile?.id !== distributorId)) {
      throw new ForbiddenException();
    }
    const permitted = resolveCompanyIds(user, companyId);
    if (permitted && ![profile.companyId, ...(profile.companyIds ?? [])].some(c => c && permitted.includes(c))) throw new ForbiddenException();
    return this.tracking.getDaily(distributorId, date, permitted);
  }

  @Get(':distributorId/daily')
  @ApiOperation({ summary: 'Get daily route with stats' })
  async getDaily(
    @Request() req: { user: User },
    @Param('distributorId') distributorId: string,
    @Query('date') date: string,
  ) {
    await this.assertAccess(req.user, distributorId);
    return this.service.getDailyRoute(distributorId, date);
  }

  @Get(':distributorId/weekly')
  @ApiOperation({ summary: 'Get weekly route summary' })
  async getWeekly(
    @Request() req: { user: User },
    @Param('distributorId') distributorId: string,
    @Query('weekStart') weekStart: string,
  ) {
    await this.assertAccess(req.user, distributorId);
    return this.service.getWeeklyRoute(distributorId, weekStart);
  }
}
