import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Route History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly service: RoutesService) {}

  @Get(':distributorId/daily')
  @ApiOperation({ summary: 'Get daily route with stats' })
  getDaily(
    @Param('distributorId') distributorId: string,
    @Query('date') date: string,
  ) {
    return this.service.getDailyRoute(distributorId, date);
  }

  @Get(':distributorId/weekly')
  @ApiOperation({ summary: 'Get weekly route summary' })
  getWeekly(
    @Param('distributorId') distributorId: string,
    @Query('weekStart') weekStart: string,
  ) {
    return this.service.getWeeklyRoute(distributorId, weekStart);
  }
}
