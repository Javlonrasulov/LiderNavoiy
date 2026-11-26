import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { RequirePage } from '../common/guards/permissions.guard';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import { assertManagerCompanyAccess } from '../common/company-scope.util';
import { CompanySocialLinksService } from './company-social-links.service';
import {
  CreateCompanySocialLinkDto,
  UpdateCompanySocialLinkDto,
} from './dto/company-social-link.dto';

@ApiTags('Company social links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@RequirePage('tashkilotRekvizitlari')
@Controller('companies/:companyId/social-links')
export class CompanySocialLinksController {
  constructor(private readonly service: CompanySocialLinksService) {}

  private assertAccess(user: User, companyId: string) {
    if (user.role === UserRole.MANAGER) {
      assertManagerCompanyAccess(user, companyId);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List organization social links' })
  findAll(
    @Request() req: { user: User },
    @Param('companyId') companyId: string,
  ) {
    this.assertAccess(req.user, companyId);
    return this.service.findAll(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create social link' })
  create(
    @Request() req: { user: User },
    @Param('companyId') companyId: string,
    @Body() dto: CreateCompanySocialLinkDto,
  ) {
    this.assertAccess(req.user, companyId);
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update social link' })
  update(
    @Request() req: { user: User },
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanySocialLinkDto,
  ) {
    this.assertAccess(req.user, companyId);
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete social link' })
  remove(
    @Request() req: { user: User },
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    this.assertAccess(req.user, companyId);
    return this.service.remove(companyId, id);
  }
}
