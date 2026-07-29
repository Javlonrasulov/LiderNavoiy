import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { User } from '../auth/entities/user.entity';
import { TerminalsService } from './terminals.service';
import { CreateTerminalDto, UpdateTerminalDto } from './dto/terminal.dto';

@ApiTags('Terminals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('terminals')
export class TerminalsController {
  constructor(private readonly service: TerminalsService) {}

  @Get('my')
  @ApiOperation({ summary: 'List terminals assigned to current delivery person' })
  findMy(@Request() req: { user: User }) {
    return this.service.findMy(req.user.distributorProfile!.id);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all payment terminals (admin)' })
  findAll(@Query('companyId') companyId?: string) {
    return this.service.findAll(companyId);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get terminal by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create payment terminal' })
  create(@Body() dto: CreateTerminalDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update payment terminal' })
  update(@Param('id') id: string, @Body() dto: UpdateTerminalDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Deactivate payment terminal' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
