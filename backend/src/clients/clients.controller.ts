import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List clients' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('lineCode') lineCode?: string,
  ) {
    return this.service.findAll(companyId, lineCode);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search clients' })
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
