import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  private scopeDistributorId(user: User): string | undefined {
    if (user.role === UserRole.DISTRIBUTOR) {
      return user.distributorProfile?.id;
    }
    return undefined;
  }

  @Get()
  @ApiOperation({ summary: 'List clients' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
    @Query('lineCode') lineCode?: string,
  ) {
    return this.service.findAll(companyId, lineCode, this.scopeDistributorId(req.user));
  }

  @Get('search')
  @ApiOperation({ summary: 'Search clients' })
  search(@Request() req: { user: User }, @Query('q') q: string) {
    return this.service.search(q, this.scopeDistributorId(req.user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(@Request() req: { user: User }, @Param('id') id: string) {
    return this.service.findOne(id, this.scopeDistributorId(req.user));
  }

  @Post()
  @ApiOperation({ summary: 'Create client' })
  create(@Body() dto: CreateClientDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.service.update(id, dto);
  }
}
