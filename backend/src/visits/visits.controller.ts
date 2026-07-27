import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateVisitDto, BatchSyncDto } from './dto/visit.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly service: VisitsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a client visit' })
  create(@Request() req: { user: User }, @Body() dto: CreateVisitDto) {
    return this.service.create(req.user.distributorProfile!.id, dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync offline visits batch' })
  syncBatch(@Request() req: { user: User }, @Body() dto: BatchSyncDto) {
    return this.service.syncBatch(req.user.distributorProfile!.id, dto.visits);
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List visits for a distributor (admin)' })
  findForDistributor(
    @Query('distributorId') distributorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('date') date?: string,
  ) {
    if (!distributorId) {
      return [];
    }
    if (date) {
      const dayFrom = new Date(`${date}T00:00:00+05:00`);
      const dayTo = new Date(`${date}T23:59:59.999+05:00`);
      return this.service.findByDistributor(distributorId, dayFrom, dayTo);
    }
    return this.service.findByDistributor(
      distributorId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get my visits' })
  findMine(
    @Request() req: { user: User },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findByDistributor(
      req.user.distributorProfile!.id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
