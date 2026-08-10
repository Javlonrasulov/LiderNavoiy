import { Controller, Get, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DistributorsService } from './distributors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DistributorStatus, UserRole } from '../common/enums';
import { User } from '../auth/entities/user.entity';
import {
  assertManagerCompanyAccess,
  resolveCompanyIds,
} from '../common/company-scope.util';

@ApiTags('Distributors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('distributors')
export class DistributorsController {
  constructor(private readonly service: DistributorsService) {}

  @Get()
  @ApiOperation({ summary: 'List distributors (agents/delivery only; org-scoped for managers)' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    const user = req.user;
    const companyIds = resolveCompanyIds(user, companyId);

    if (user.role === UserRole.MANAGER && (!companyIds || companyIds.length === 0)) {
      return [];
    }

    return this.service.findAll(companyIds, {
      excludeUserId: user.id,
    });
  }

  @Get('online')
  @ApiOperation({ summary: 'Get online distributor IDs' })
  async getOnline(@Request() req: { user: User }) {
    const online = await this.service.getOnlineDistributors();
    if (req.user.role !== UserRole.MANAGER) return online;
    const allowed = resolveCompanyIds(req.user);
    if (!allowed?.length) return [];
    const staff = await this.service.findAll(allowed);
    const allowedIds = new Set(staff.map((d) => d.id));
    return online.filter((id) => allowedIds.has(id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get distributor by ID' })
  async findOne(@Request() req: { user: User }, @Param('id') id: string) {
    const d = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, d?.companyId);
    return d;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update distributor status' })
  async updateStatus(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body('status') status: DistributorStatus,
  ) {
    const d = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, d?.companyId);
    return this.service.updateStatus(id, status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update distributor profile (phone, position, line)' })
  async updateProfile(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() body: { phone?: string | null; position?: string | null; lineCode?: string | null },
  ) {
    const d = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, d?.companyId);
    return this.service.updateProfile(id, body);
  }
}
