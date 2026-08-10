import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { assertManagerCompanyAccess } from '../common/company-scope.util';

@ApiTags('Route History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(
    private readonly service: RoutesService,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
  ) {}

  private async assertAccess(user: User, distributorId: string) {
    const profile = await this.profileRepo.findOne({ where: { id: distributorId } });
    assertManagerCompanyAccess(user, profile?.companyId);
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
