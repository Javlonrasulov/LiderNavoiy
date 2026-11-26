import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { UserRole } from '../common/enums';
import {
  assertManagerCompanyAccess,
  resolveCompanyIds,
} from '../common/company-scope.util';
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
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    const scope = resolveCompanyIds(req.user, companyId);
    if (req.user.role === UserRole.MANAGER && Array.isArray(scope) && scope.length === 0) {
      return [];
    }
    if (Array.isArray(scope)) {
      return this.service.findAll(scope.length === 1 ? scope[0] : scope);
    }
    return this.service.findAll(companyId);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get terminal by ID' })
  async findOne(@Request() req: { user: User }, @Param('id') id: string) {
    const row = await this.service.findOne(id);
    if (req.user.role === UserRole.MANAGER) {
      assertManagerCompanyAccess(req.user, row.companyId);
    }
    return row;
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create payment terminal' })
  create(@Request() req: { user: User }, @Body() dto: CreateTerminalDto) {
    if (req.user.role === UserRole.MANAGER) {
      if (!dto.companyId) {
        throw new ForbiddenException('Tashkilot ko‘rsatilishi shart');
      }
      assertManagerCompanyAccess(req.user, dto.companyId);
    }
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update payment terminal' })
  async update(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateTerminalDto,
  ) {
    const existing = await this.service.findOne(id);
    if (req.user.role === UserRole.MANAGER) {
      assertManagerCompanyAccess(req.user, existing.companyId);
      if (dto.companyId !== undefined) {
        assertManagerCompanyAccess(req.user, dto.companyId);
      }
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Deactivate payment terminal' })
  async remove(@Request() req: { user: User }, @Param('id') id: string) {
    const existing = await this.service.findOne(id);
    if (req.user.role === UserRole.MANAGER) {
      assertManagerCompanyAccess(req.user, existing.companyId);
    }
    return this.service.remove(id);
  }
}
