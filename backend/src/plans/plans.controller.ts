import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PlansService } from './plans.service';
import { UpsertPlanDto } from './dto/plan.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly service: PlansService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create or update agent monthly plan (admin)' })
  upsert(@Body() dto: UpsertPlanDto, @Request() req: { user: User }) {
    return this.service.upsert(dto, req.user.id);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List agent plans for a month (admin)' })
  list(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('companyId') companyId?: string,
  ) {
    const companyIds = companyId ? companyId.split(',').filter(Boolean) : undefined;
    return this.service.listPlans(
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
      companyIds,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my plan for current or specified month' })
  getMy(
    @Request() req: { user: User },
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.getMyPlan(
      req.user.id,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

  @Get('team')
  @ApiOperation({ summary: 'Get team plans (same company) for leaderboard' })
  getTeam(
    @Request() req: { user: User },
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.service.getTeamPlans(
      req.user.id,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }
}
