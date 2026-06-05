import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

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
