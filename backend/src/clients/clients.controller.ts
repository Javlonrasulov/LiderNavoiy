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
import { SkipThrottle } from '@nestjs/throttler';
import { CreateClientDto, UpdateClientDto, TransferClientsDto } from './dto/client.dto';
import { SetClientCredentialsDto, SetClientAppLoginActiveDto } from './dto/client-credentials.dto';
import { CreateClientRequestDto } from './dto/client-request.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import {
  assertManagerCompanyAccess,
  resolveWritableCompanyId,
} from '../common/company-scope.util';

function resolveSubmitterMeta(user: User): { name: string; position: string | null } {
  const name = user.fullName ?? user.username;
  const position =
    user.distributorProfile?.position?.trim() ||
    user.position?.trim() ||
    (user.role === UserRole.MANAGER
      ? 'Manager'
      : user.role === UserRole.DISTRIBUTOR
        ? 'Agent'
        : user.role === UserRole.ADMIN
          ? 'Admin'
          : null);
  return { name, position };
}

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

  /** DTO yoki profil — manager uchun faqat allow-list */
  private resolveCompanyId(
    user: User,
    dtoCompanyId?: string | null,
  ): string | undefined {
    return resolveWritableCompanyId(user, dtoCompanyId);
  }

  private scopeCompanyIds(user: User, queryCompanyId?: string): string | string[] | undefined {
    const fromQuery = (queryCompanyId || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (user.role === UserRole.ADMIN) {
      if (!fromQuery.length) return undefined;
      return fromQuery.length === 1 ? fromQuery[0] : fromQuery;
    }

    if (user.role === UserRole.MANAGER) {
      const profile = user.distributorProfile;
      const allowed = [
        ...new Set(
          [
            ...(Array.isArray(profile?.companyIds) ? profile.companyIds : []),
            profile?.companyId,
          ]
            .map((id) => id?.trim())
            .filter((id): id is string => !!id),
        ),
      ];
      // Org biriktirilmagan manager — hech narsa ko‘rsatilmasin
      if (!allowed.length) return [];
      const ids = fromQuery.length
        ? fromQuery.filter((id) => allowed.includes(id))
        : allowed;
      if (!ids.length) return [];
      return ids.length === 1 ? ids[0] : ids;
    }

    // Agent: o‘z org(lar)i
    if (user.role === UserRole.DISTRIBUTOR && user.distributorProfile) {
      const profile = user.distributorProfile;
      const ids = [
        ...new Set(
          [
            ...(Array.isArray(profile.companyIds) ? profile.companyIds : []),
            profile.companyId,
          ]
            .map((id) => id?.trim())
            .filter((id): id is string => !!id),
        ),
      ];
      if (!ids.length) return undefined;
      return ids.length === 1 ? ids[0] : ids;
    }

    if (!fromQuery.length) return undefined;
    return fromQuery.length === 1 ? fromQuery[0] : fromQuery;
  }

  private assertAdminOrManager(user: User) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
      throw new ForbiddenException("Faqat admin/manager uchun");
    }
  }

  private async agentLineCodesFor(user: User): Promise<string[]> {
    if (user.role !== UserRole.DISTRIBUTOR || !user.distributorProfile) {
      return [];
    }
    const codes = new Set<string>();
    const profileCode = user.distributorProfile.lineCode?.trim();
    if (profileCode) codes.add(profileCode);
    const companyId = this.resolveCompanyId(user);
    const lines = await this.service.findLines(
      typeof companyId === 'string' ? companyId : undefined,
    );
    const agentName = user.fullName?.trim();
    for (const line of lines) {
      if (agentName && line.agentName?.trim() === agentName) {
        codes.add(line.code);
      }
    }
    return [...codes];
  }

  @Get()
  @ApiOperation({ summary: 'List clients' })
  async findAll(
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
    const agentLineCodes = scoped
      ? await this.agentLineCodesFor(req.user)
      : undefined;
    const companyScope = this.scopeCompanyIds(req.user, companyId);
    if (Array.isArray(companyScope) && companyScope.length === 0) {
      return [];
    }
    return this.service.findAll(
      companyScope,
      lineCode,
      filterDistributorId,
      agentLineCodes,
    );
  }

  @Get('trash')
  @ApiOperation({ summary: 'List soft-deleted clients (admin trash)' })
  findTrash(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    this.assertAdminOrManager(req.user);
    const scope = this.scopeCompanyIds(req.user, companyId);
    if (req.user.role === UserRole.MANAGER && (!scope || (Array.isArray(scope) && scope.length === 0))) {
      return [];
    }
    const asQuery =
      Array.isArray(scope) ? scope.join(',') : typeof scope === 'string' ? scope : companyId;
    return this.service.findTrash(asQuery);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search clients' })
  async search(
    @Request() req: { user: User },
    @Query('q') q: string,
    @Query('companyId') companyId?: string,
  ) {
    const scoped = this.scopeDistributorId(req.user);
    const agentLineCodes = scoped
      ? await this.agentLineCodesFor(req.user)
      : undefined;
    const companyScope = this.scopeCompanyIds(req.user, companyId);
    if (req.user.role === UserRole.MANAGER && (!companyScope || (Array.isArray(companyScope) && companyScope.length === 0))) {
      return [];
    }
    return this.service.search(q, scoped, agentLineCodes, companyScope);
  }

  @Post('assign-line-distributor')
  @ApiOperation({ summary: 'Assign all clients on a line to a distributor (agent)' })
  assignLineDistributor(
    @Request() req: { user: User },
    @Body() body: { lineCode: string; distributorId: string | null },
  ) {
    this.assertAdminOrManager(req.user);
    return this.service.assignDistributorToLine(
      body.lineCode,
      body.distributorId ?? null,
    );
  }

  @Post('ensure-numeric-codes')
  @ApiOperation({ summary: 'Fill missing/invalid client codes with sequential numbers' })
  async ensureNumericCodes(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    this.assertAdminOrManager(req.user);
    const scope = this.scopeCompanyIds(req.user, companyId);
    try {
      const updated = await this.service.ensureNumericCodes(scope);
      return { updated };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kodlarni yangilab bo‘lmadi';
      return { updated: 0, error: msg };
    }
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
  async getAppCredentials(@Request() req: { user: User }, @Param('id') id: string) {
    const client = await this.service.findOne(id, this.scopeDistributorId(req.user));
    assertManagerCompanyAccess(req.user, client.companyId);
    return this.credentialsService.getCredentials(id, req.user);
  }

  @Post(':id/app-credentials')
  @ApiOperation({ summary: 'Set client app login/password (admin/agent)' })
  async setAppCredentials(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: SetClientCredentialsDto,
  ) {
    const client = await this.service.findOne(id, this.scopeDistributorId(req.user));
    assertManagerCompanyAccess(req.user, client.companyId);
    return this.credentialsService.setCredentials(id, dto, req.user);
  }

  @Patch(':id/app-credentials/active')
  @ApiOperation({ summary: 'Enable/disable client APK login' })
  async setAppLoginActive(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: SetClientAppLoginActiveDto,
  ) {
    const client = await this.service.findOne(id, this.scopeDistributorId(req.user));
    assertManagerCompanyAccess(req.user, client.companyId);
    return this.credentialsService.setLoginActive(id, dto.isActive, req.user);
  }

  @Get(':id/reconciliation')
  @ApiOperation({ summary: 'Client reconciliation statement' })
  async getReconciliation(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const client = await this.service.findOne(id, this.scopeDistributorId(req.user));
    assertManagerCompanyAccess(req.user, client.companyId);
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
  async getStats(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Query('period') period?: 'hafta' | 'oy' | '6oy' | 'custom',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const client = await this.service.findOne(id, this.scopeDistributorId(req.user));
    assertManagerCompanyAccess(req.user, client.companyId);
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
  async restore(@Request() req: { user: User }, @Param('id') id: string) {
    this.assertAdminOrManager(req.user);
    const client = await this.service.findOne(id, undefined, { includeDeleted: true });
    assertManagerCompanyAccess(req.user, client.companyId);
    return this.service.restore(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete client (move to trash)' })
  async softDelete(@Request() req: { user: User }, @Param('id') id: string) {
    this.assertAdminOrManager(req.user);
    const client = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, client.companyId);
    return this.service.softDelete(id, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get client by ID' })
  async findOne(@Request() req: { user: User }, @Param('id') id: string) {
    const client = await this.service.findOne(id, this.scopeDistributorId(req.user));
    assertManagerCompanyAccess(req.user, client.companyId);
    return client;
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
    dto: { appUsername?: string; appPassword?: string; appLoginActive?: boolean },
    user: User,
  ) {
    const username = dto.appUsername?.trim().toLowerCase();
    const password = dto.appPassword;
    // Login yuborilmasa ham ruxsat holati alohida o'zgartirilishi mumkin.
    if (!username) {
      if (dto.appLoginActive !== undefined) {
        await this.credentialsService.setLoginActive(
          clientId,
          dto.appLoginActive,
          user,
        );
      }
      return;
    }
    await this.credentialsService.setCredentials(
      clientId,
      { username, password, isActive: dto.appLoginActive },
      user,
    );
  }

  @Post()
  @SkipThrottle()
  @ApiOperation({ summary: 'Create client' })
  async create(@Request() req: { user: User }, @Body() dto: CreateClientDto) {
    const { appUsername, appPassword, appLoginActive, ...clientDto } = dto;
    const distributorId = this.scopeDistributorId(req.user);
    const companyId = this.resolveCompanyId(req.user, clientDto.companyId);

    if (req.user.role === UserRole.DISTRIBUTOR) {
      if (!req.user.distributorProfile?.canAddClients) {
        throw new ForbiddenException(
          'Админ томонидан рухсат берилмаган. Администраторга мурожаат қилинг.',
        );
      }
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
      const { name: agentName, position } = resolveSubmitterMeta(req.user);
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
      return this.requestsService.create(
        requestDto,
        distributorId,
        agentName,
        position ?? undefined,
      );
    }

    const client = await this.service.create(
      {
        ...clientDto,
        companyId,
        distributorId: clientDto.distributorId ?? distributorId,
      },
      req.user,
    );
    await this.applyAppCredentials(
      client.id,
      { appUsername, appPassword, appLoginActive },
      req.user,
    );
    return client;
  }

  @Patch(':id')
  @SkipThrottle()
  @ApiOperation({ summary: 'Update client' })
  async update(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const { appUsername, appPassword, appLoginActive, ...clientDto } = dto;
    const distributorId = this.scopeDistributorId(req.user);

    const existing = await this.service.findOne(id, distributorId);
    const companyId = this.resolveCompanyId(
      req.user,
      clientDto.companyId ?? existing.companyId,
    );

    if (req.user.role === UserRole.DISTRIBUTOR) {
      if (!req.user.distributorProfile?.canAddClients) {
        throw new ForbiddenException(
          'Админ томонидан рухсат берилмаган. Администраторга мурожаат қилинг.',
        );
      }
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
      const { name: agentName, position } = resolveSubmitterMeta(req.user);
      return this.requestsService.createUpdate(
        id,
        { ...clientDto, companyId },
        distributorId,
        agentName,
        position ?? undefined,
      );
    }

    const client = await this.service.update(id, clientDto, req.user);
    await this.applyAppCredentials(
      id,
      { appUsername, appPassword, appLoginActive },
      req.user,
    );
    return client;
  }
}
