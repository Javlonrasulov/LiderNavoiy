import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ClientsService } from './clients.service';
import { ClientsUploadService } from './clients-upload.service';
import { ClientRequestsService } from './client-requests.service';
import { ClientReconciliationService } from './client-reconciliation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { CreateClientRequestDto } from './dto/client-request.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly service: ClientsService,
    private readonly uploadService: ClientsUploadService,
    private readonly requestsService: ClientRequestsService,
    private readonly reconciliationService: ClientReconciliationService,
  ) {}

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

  @Get('lines')
  @ApiOperation({ summary: 'List lines for client assignment' })
  findLines(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    const scopedCompany =
      companyId ?? req.user.distributorProfile?.companyId ?? undefined;
    return this.service.findLines(scopedCompany);
  }

  @Get(':id/reconciliation')
  @ApiOperation({ summary: 'Client reconciliation statement' })
  getReconciliation(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.reconciliationService.getStatement(
      id,
      fromDate,
      toDate,
      this.scopeDistributorId(req.user),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(@Request() req: { user: User }, @Param('id') id: string) {
    return this.service.findOne(id, this.scopeDistributorId(req.user));
  }

  @Post('upload-photo')
  @ApiOperation({ summary: 'Upload client storefront photo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.savePhoto(file);
  }

  @Post()
  @ApiOperation({ summary: 'Create client' })
  create(@Request() req: { user: User }, @Body() dto: CreateClientDto) {
    const distributorId = this.scopeDistributorId(req.user);
    if (req.user.role === UserRole.DISTRIBUTOR) {
      const agentName = req.user.fullName ?? req.user.username;
      const requestDto: CreateClientRequestDto = {
        name: dto.name,
        fullName: dto.fullName,
        phone: dto.phone,
        address: dto.address,
        companyId: dto.companyId ?? req.user.distributorProfile?.companyId ?? undefined,
        lineCode: dto.lineCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        category: dto.category,
        inn: dto.inn,
        contactPerson: dto.contactPerson,
        territory: dto.territory,
        clientClass: dto.clientClass,
        priceCategory: dto.priceCategory,
        photoUrl: dto.photoUrl,
      };
      return this.requestsService.create(requestDto, distributorId, agentName);
    }
    return this.service.create({
      ...dto,
      distributorId: dto.distributorId ?? distributorId,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.service.update(id, dto);
  }
}
