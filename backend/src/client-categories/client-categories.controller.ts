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
import { ClientCategoriesService } from './client-categories.service';
import {
  CreateClientCategoryDto,
  UpdateClientCategoryDto,
} from './dto/client-category.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import {
  assertManagerCompanyAccess,
  resolveCompanyIds,
  resolveWritableCompanyId,
} from '../common/company-scope.util';

@ApiTags('Client categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('client-categories')
export class ClientCategoriesController {
  constructor(private readonly service: ClientCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List client categories for organization' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    const companyIds = resolveCompanyIds(req.user, companyId);
    if (req.user.role === UserRole.MANAGER && (!companyIds || companyIds.length === 0)) {
      return [];
    }
    return this.service.findAll(companyIds);
  }

  @Post()
  @ApiOperation({ summary: 'Create client category' })
  create(
    @Request() req: { user: User },
    @Body() dto: CreateClientCategoryDto,
  ) {
    const cid = resolveWritableCompanyId(req.user, dto.companyId);
    return this.service.create({ ...dto, companyId: cid });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client category' })
  async update(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateClientCategoryDto,
  ) {
    const existing = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, existing.companyId);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate client category' })
  async remove(@Request() req: { user: User }, @Param('id') id: string) {
    const existing = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, existing.companyId);
    return this.service.remove(id);
  }
}
