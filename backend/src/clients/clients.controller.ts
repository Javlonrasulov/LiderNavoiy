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
import { ClientCredentialsService } from './client-credentials.service';
import { ClientStatsService } from './client-stats.service';
import { CompaniesService } from '../companies/companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateClientDto, UpdateClientDto, TransferClientsDto } from './dto/client.dto';
import { SetClientCredentialsDto } from './dto/client-credentials.dto';
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
    private readonly credentialsService: ClientCredentialsService,
    private readonly statsService: ClientStatsService,
    private readonly companiesService: CompaniesService,
  ) {}

  private scopeDistributorId(user: User): string | undefined {
    if (user.role === UserRole.DISTRIBUTOR) {
      return user.distributorProfile?.id;
    }
    return undefined;
  }

  private assertAdminOrManager(user: User) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      throw new ForbiddenException("Faqat admin/manager uchun");
    }
  }

  @Get()
  @ApiOperation({ summary: 'List clients' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
    @Query('lineCode') lineCode?: string,
    @Query('distributorId') distributorId?: string,
  ) {
    const scoped = this.scopeDistributorId(req.user);
    const filterDistributorId =
      scoped ??
      (req.user.role === UserRole.ADMIN || req.user.role === UserRole.MANAGER
        ? distributorId
        : undefined);
    return this.service.findAll(companyId, lineCode, filterDistributorId);
  }

  @Get('trash')
  @ApiOperation({ summary: 'List soft-deleted clients (admin trash)' })
  findTrash(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    this.assertAdminOrManager(req.user);
    return this.service.findTrash(companyId);
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

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer clients to another organization (INN duplicate check)' })
  transfer(
    @Request() req: { user: User },
    @Body() dto: TransferClientsDto,
  ) {
    this.assertAdminOrManager(req.user);
    return this.service.transfer(dto);
  }

  @Post('trash/bulk')
  @ApiOperation({ summary: 'Move multiple clients to trash' })
  softDeleteBulk(
    @Request() req: { user: User },
    @Body() body: { clientIds: string[] },
  ) {
    this.assertAdminOrManager(req.user);
    return this.service.softDeleteMany(body.clientIds ?? [], req.user);
  }

  @Get('app-username-available')
  @ApiOperation({ summary: 'Check if client APK login is free' })
  checkAppUsername(
    @Query('username') username: string,
    @Query('excludeClientId') excludeClientId?: string,
  ) {
    return this.credentialsService.checkUsername(username, excludeClientId);
  }

  @Get(':id/app-credentials')
  @ApiOperation({ summary: 'Get client app login (admin/agent)' })
  getAppCredentials(@Request() req: { user: User }, @Param('id') id: string) {
    return this.credentialsService.getCredentials(id, req.user);
  }

  @Post(':id/app-credentials')
  @ApiOperation({ summary: 'Set client app login/password (admin/agent)' })
  setAppCredentials(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: SetClientCredentialsDto,
  ) {
    return this.credentialsService.setCredentials(id, dto, req.user);
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

  @Get(':id/stats')
  @ApiOperation({ summary: 'Client purchase statistics for admin panel' })
  getStats(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Query('period') period?: 'hafta' | 'oy' | '6oy' | 'custom',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statsService.getStats(
      id,
      period ?? 'oy',
      from,
      to,
      this.scopeDistributorId(req.user),
    );
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore client from trash' })
  restore(@Request() req: { user: User }, @Param('id') id: string) {
    this.assertAdminOrManager(req.user);
    return this.service.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete client (move to trash)' })
  softDelete(@Request() req: { user: User }, @Param('id') id: string) {
    this.assertAdminOrManager(req.user);
    return this.service.softDelete(id, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  findOne(@Request() req: { user: User }, @Param('id') id: string) {
    return this.service.findOne(id, this.scopeDistributorId(req.user));
  }

  @Post('upload-photo')
  @ApiOperation({ summary: 'Upload client storefront photo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.savePhoto(file);
  }

  private async applyAppCredentials(
    clientId: string,
    dto: { appUsername?: string; appPassword?: string },
    user: User,
  ) {
    const username = dto.appUsername?.trim().toLowerCase();
    const password = dto.appPassword;
    if (!username || !password) return;
    await this.credentialsService.setCredentials(
      clientId,
      { username, password },
      user,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create client' })
  async create(@Request() req: { user: User }, @Body() dto: CreateClientDto) {
    const { appUsername, appPassword, ...clientDto } = dto;
    const distributorId = this.scopeDistributorId(req.user);
    const companyId =
      clientDto.companyId ?? req.user.distributorProfile?.companyId ?? undefined;

    if (req.user.role === UserRole.DISTRIBUTOR) {
      await this.companiesService.assertAgentsCanAddClients(companyId);
    }

    const isAdmin = req.user.role === UserRole.ADMIN;
    const skipApproval =
      isAdmin ||
      (await this.companiesService.getClientsAddWithoutApproval(companyId));

    const requiresApproval =
      !skipApproval &&
      (req.user.role === UserRole.DISTRIBUTOR ||
        req.user.role === UserRole.MANAGER);

    if (requiresApproval) {
      const agentName = req.user.fullName ?? req.user.username;
      const requestDto: CreateClientRequestDto = {
        name: clientDto.name,
        fullName: clientDto.fullName,
        phone: clientDto.phone,
        address: clientDto.address,
        companyId,
        lineCode: clientDto.lineCode,
        latitude: clientDto.latitude,
        longitude: clientDto.longitude,
        category: clientDto.category,
        inn: clientDto.inn,
        contactPerson: clientDto.contactPerson,
        territory: clientDto.territory,
        clientClass: clientDto.clientClass,
        priceCategory: clientDto.priceCategory,
        photoUrl: clientDto.photoUrl,
        canSeePromotions: clientDto.canSeePromotions === true,
      };
      return this.requestsService.create(requestDto, distributorId, agentName);
    }

    const client = await this.service.create(
      {
        ...clientDto,
        companyId,
        distributorId: clientDto.distributorId ?? distributorId,
      },
      req.user,
    );
    await this.applyAppCredentials(client.id, { appUsername, appPassword }, req.user);
    return client;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update client' })
  async update(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const { appUsername, appPassword, ...clientDto } = dto;
    const distributorId = this.scopeDistributorId(req.user);

    const existing = await this.service.findOne(id, distributorId);
    const companyId =
      existing.companyId ?? req.user.distributorProfile?.companyId ?? undefined;

    const isAdmin = req.user.role === UserRole.ADMIN;
    const skipApproval =
      isAdmin ||
      (await this.companiesService.getClientsAddWithoutApproval(companyId));

    const requiresApproval =
      !skipApproval &&
      (req.user.role === UserRole.DISTRIBUTOR ||
        req.user.role === UserRole.MANAGER);

    if (requiresApproval) {
      const agentName = req.user.fullName ?? req.user.username;
      return this.requestsService.createUpdate(
        id,
        clientDto,
        distributorId,
        agentName,
      );
    }

    const client = await this.service.update(id, clientDto, req.user);
    await this.applyAppCredentials(id, { appUsername, appPassword }, req.user);
    return client;
  }
}
