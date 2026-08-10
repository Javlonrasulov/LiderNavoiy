import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { CompaniesUploadService } from './companies-upload.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

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
  findAll() {
    return this.service.findAll();
  }

  @Post('upload-image')
  @ApiOperation({ summary: 'Upload organization image (data URL)' })
  uploadImage(@Body() body: { dataUrl: string }) {
    return this.uploadService.saveDataUrl(body.dataUrl);
  }

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  create(@Body() dto: CreateCompanyDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.service.update(id, dto);
  }
}
