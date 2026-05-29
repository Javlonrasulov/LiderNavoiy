import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VisitsService } from './visits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
