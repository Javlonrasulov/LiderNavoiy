import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import { ClientRequestsService } from './client-requests.service';
import { ClientsService } from './clients.service';
import { ClientCredentialsService } from './client-credentials.service';
import { CompaniesService } from '../companies/companies.service';
import { CreateClientRequestDto } from './dto/client-request.dto';
import {
  ClientRequestStatus,
  ClientRequestType,
} from './entities/client-request.entity';
import { assertManagerCompanyAccess } from '../common/company-scope.util';

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

@ApiTags('Client Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('client-requests')
export class ClientRequestsController {
  constructor(
    private readonly service: ClientRequestsService,
    private readonly clientsService: ClientsService,
    private readonly credentialsService: ClientCredentialsService,
    private readonly companiesService: CompaniesService,
  ) {}

  private resolveCompanyIds(
    user: User,
    queryCompanyId?: string | null,
  ): string[] | undefined {
    const fromQuery = (queryCompanyId || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (user.role === UserRole.ADMIN) {
      return fromQuery.length ? fromQuery : undefined;
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
      if (!allowed.length) return [];
      if (fromQuery.length) {
        return fromQuery.filter((id) => allowed.includes(id));
      }
      return allowed;
    }

    const fromDto = queryCompanyId?.trim();
    if (fromDto && !fromDto.includes(',')) return [fromDto];
    const profile = user.distributorProfile;
    if (!profile) return fromQuery.length ? fromQuery : undefined;
    const primary = profile.companyId?.trim();
    if (primary) return [primary];
    const ids = [
      ...new Set(
        (Array.isArray(profile.companyIds) ? profile.companyIds : [])
          .map((id) => id?.trim())
          .filter((id): id is string => !!id),
      ),
    ];
    return ids.length ? ids : undefined;
  }

  /** Bitta companyId kerak bo‘lgan joylar (create) uchun */
  private resolveCompanyId(
    user: User,
    dtoCompanyId?: string | null,
  ): string | undefined {
    const ids = this.resolveCompanyIds(user, dtoCompanyId);
    return ids?.[0];
  }

  @Get()
  @ApiOperation({
    summary:
      'List client requests (admin/manager: company; agent: own). status=pending|approved|rejected|all',
  })
  findList(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    const companyIds = this.resolveCompanyIds(req.user, companyId);
    const normalized =
      status === 'approved' ||
      status === 'rejected' ||
      status === 'pending' ||
      status === 'all'
        ? status
        : undefined;

    if (req.user.role === UserRole.MANAGER && (!companyIds || companyIds.length === 0)) {
      return [];
    }

    if (req.user.role === UserRole.DISTRIBUTOR) {
      return this.service.findList({
        companyId: companyIds,
        distributorId: req.user.distributorProfile?.id,
        status: (normalized as ClientRequestStatus | 'all' | undefined) ?? 'all',
      });
    }

    // Admin bell: default pending. Manager: default all (ko‘rish uchun).
    const defaultStatus: ClientRequestStatus | 'all' =
      req.user.role === UserRole.MANAGER ? 'all' : ClientRequestStatus.PENDING;
    return this.service.findList({
      companyId: companyIds,
      status: (normalized as ClientRequestStatus | 'all' | undefined) ?? defaultStatus,
    });
  }

  @Get(':id/inn-check')
  @ApiOperation({ summary: 'Check INN duplicate for a request' })
  checkInn(@Param('id') id: string) {
    return this.service.findOne(id).then(async (row) => {
      const dup = await this.service.checkInnDuplicate(row.inn, id);
      return {
        inn: row.inn,
        ...dup,
      };
    });
  }

  @Post()
  @ApiOperation({ summary: 'Agent/manager submits new client (approval or direct)' })
  async create(@Request() req: { user: User }, @Body() dto: CreateClientRequestDto) {
    const companyId = this.resolveCompanyId(req.user, dto.companyId);

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

    if (skipApproval) {
      const client = await this.clientsService.create(
        {
          name: dto.name,
          fullName: dto.fullName,
          phone: dto.phone,
          address: dto.address,
          companyId,
          lineCode: dto.lineCode,
          latitude: dto.latitude,
          longitude: dto.longitude,
          category: dto.category,
          distributorId: req.user.distributorProfile?.id,
          inn: dto.inn,
          contactPerson: dto.contactPerson,
          territory: dto.territory,
          clientClass: dto.clientClass,
          priceCategory: dto.priceCategory,
          photoUrl: dto.photoUrl,
          canSeePromotions: dto.canSeePromotions === true,
        },
        req.user,
      );
      await this.credentialsService.ensureDefaultCredentials(client.id, req.user);
      return client;
    }

    const distributorId = req.user.distributorProfile?.id;
    const { name: agentName, position } = resolveSubmitterMeta(req.user);
    return this.service.create(
      {
        ...dto,
        companyId,
      },
      distributorId,
      agentName,
      position ?? undefined,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Admin approves client request' })
  async approve(@Request() req: { user: User }, @Param('id') id: string) {
    const existing = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, existing.companyId);
    const reviewer = req.user.fullName ?? req.user.username;
    const result = await this.service.approve(id, reviewer, req.user);
    if (result.request.requestType !== ClientRequestType.UPDATE) {
      await this.credentialsService.ensureDefaultCredentials(result.client.id, req.user);
    }
    return result;
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Admin rejects client request' })
  async reject(@Request() req: { user: User }, @Param('id') id: string) {
    const existing = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, existing.companyId);
    const reviewer = req.user.fullName ?? req.user.username;
    return this.service.reject(id, reviewer);
  }

  @Post(':id/resubmit')
  @ApiOperation({ summary: 'Resubmit rejected client request after edits' })
  async resubmit(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: CreateClientRequestDto,
  ) {
    const companyId = this.resolveCompanyId(req.user, dto.companyId);
    const skipApproval =
      req.user.role === UserRole.ADMIN ||
      (await this.companiesService.getClientsAddWithoutApproval(companyId));

    if (skipApproval) {
      const existing = await this.service.findOne(id);
      if (existing.requestType === ClientRequestType.UPDATE && existing.targetClientId) {
        const client = await this.clientsService.update(
          existing.targetClientId,
          {
            name: dto.name,
            fullName: dto.fullName,
            phone: dto.phone,
            address: dto.address,
            companyId,
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
            canSeePromotions: dto.canSeePromotions === true,
          },
          req.user,
        );
        await this.service.dismiss(id);
        return client;
      }
      const client = await this.clientsService.create(
        {
          name: dto.name,
          fullName: dto.fullName,
          phone: dto.phone,
          address: dto.address,
          companyId,
          lineCode: dto.lineCode,
          latitude: dto.latitude,
          longitude: dto.longitude,
          category: dto.category,
          distributorId: req.user.distributorProfile?.id,
          inn: dto.inn,
          contactPerson: dto.contactPerson,
          territory: dto.territory,
          clientClass: dto.clientClass,
          priceCategory: dto.priceCategory,
          photoUrl: dto.photoUrl,
          canSeePromotions: dto.canSeePromotions === true,
        },
        req.user,
      );
      await this.service.dismiss(id);
      await this.credentialsService.ensureDefaultCredentials(client.id, req.user);
      return client;
    }

    const distributorId = req.user.distributorProfile?.id;
    const { name: agentName, position } = resolveSubmitterMeta(req.user);
    return this.service.resubmit(
      id,
      { ...dto, companyId },
      distributorId,
      agentName,
      position ?? undefined,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Dismiss/delete pending or rejected client request' })
  async dismiss(@Request() req: { user: User }, @Param('id') id: string) {
    const existing = await this.service.findOne(id);
    assertManagerCompanyAccess(req.user, existing.companyId);
    return this.service.dismiss(id);
  }
}
