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
import { CompanyBankAccountsService } from './company-bank-accounts.service';
import {
  CreateCompanyBankAccountDto,
  UpdateCompanyBankAccountDto,
} from './dto/company-bank-account.dto';

@ApiTags('Company bank accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@RequirePage('tashkilotRekvizitlari')
@Controller('companies/:companyId/bank-accounts')
export class CompanyBankAccountsController {
  constructor(private readonly service: CompanyBankAccountsService) {}

  private assertAccess(user: User, companyId: string) {
    if (user.role === UserRole.MANAGER) {
      assertManagerCompanyAccess(user, companyId);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List organization bank accounts' })
  findAll(
    @Request() req: { user: User },
    @Param('companyId') companyId: string,
  ) {
    this.assertAccess(req.user, companyId);
    return this.service.findAll(companyId);
  }

  @Post()
  @ApiOperation({ summary: 'Create bank account' })
  create(
    @Request() req: { user: User },
    @Param('companyId') companyId: string,
    @Body() dto: CreateCompanyBankAccountDto,
  ) {
    this.assertAccess(req.user, companyId);
    return this.service.create(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bank account' })
  update(
    @Request() req: { user: User },
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyBankAccountDto,
  ) {
    this.assertAccess(req.user, companyId);
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate bank account' })
  remove(
    @Request() req: { user: User },
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    this.assertAccess(req.user, companyId);
    return this.service.remove(companyId, id);
  }
}
