import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DistributorsService } from './distributors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DistributorStatus } from '../common/enums';

@ApiTags('Distributors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('distributors')
export class DistributorsController {
  constructor(private readonly service: DistributorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all distributors' })
  findAll(@Query('companyId') companyId?: string) {
    return this.service.findAll(companyId);
  }

  @Get('online')
  @ApiOperation({ summary: 'Get online distributor IDs' })
  getOnline() {
    return this.service.getOnlineDistributors();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get distributor by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update distributor status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: DistributorStatus,
  ) {
    return this.service.updateStatus(id, status);
  }
}
