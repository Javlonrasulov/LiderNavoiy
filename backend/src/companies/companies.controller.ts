import {
  Body,
  Controller,
  ForbiddenException,
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
import { CompaniesService } from './companies.service';
import { CompaniesUploadService } from './companies-upload.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import {
  allowedCompanyIds,
  assertManagerCompanyAccess,
} from '../common/company-scope.util';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly service: CompaniesService,
    private readonly uploadService: CompaniesUploadService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active organizations' })
  async findAll(@Request() req: { user: User }) {
    const all = await this.service.findAll();
    if (req.user.role !== UserRole.MANAGER) return all;
    const allowed = new Set(allowedCompanyIds(req.user));
    if (!allowed.size) return [];
    return all.filter((c) => allowed.has(c.id));
  }

  @Post('upload-image')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Upload organization image (data URL)' })
  uploadImage(@Body() body: { dataUrl: string }) {
    return this.uploadService.saveDataUrl(body.dataUrl);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create organization' })
  create(@Request() req: { user: User }, @Body() dto: CreateCompanyDto) {
    if (req.user.role === UserRole.MANAGER) {
      throw new ForbiddenException('Faqat admin');
    }
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update organization' })
  update(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    if (req.user.role === UserRole.MANAGER) {
      assertManagerCompanyAccess(req.user, id);
    }
    return this.service.update(id, dto);
  }
}
