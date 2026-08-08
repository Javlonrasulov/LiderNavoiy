import {
  Body,
  Controller,
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

  private resolveCompanyId(
    user: User,
    dtoCompanyId?: string | null,
  ): string | undefined {
    const fromDto = dtoCompanyId?.trim();
    if (fromDto) return fromDto;
    const profile = user.distributorProfile;
    if (!profile) return undefined;
    const primary = profile.companyId?.trim();
    if (primary) return primary;
    const ids = [
      ...new Set(
        (Array.isArray(profile.companyIds) ? profile.companyIds : [])
          .map((id) => id?.trim())
          .filter((id): id is string => !!id),
      ),
    ];
    return ids[0];
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
    const resolvedCompany = this.resolveCompanyId(req.user, companyId);
    const normalized =
      status === 'approved' ||
      status === 'rejected' ||
      status === 'pending' ||
      status === 'all'
        ? status
        : undefined;

    if (req.user.role === UserRole.DISTRIBUTOR) {
      return this.service.findList({
        companyId: resolvedCompany,
        distributorId: req.user.distributorProfile?.id,
        status: (normalized as ClientRequestStatus | 'all' | undefined) ?? 'all',
      });
    }

    // Admin bell: default pending. Manager: default all (ko‘rish uchun).
    const defaultStatus: ClientRequestStatus | 'all' =
      req.user.role === UserRole.MANAGER ? 'all' : ClientRequestStatus.PENDING;
    return this.service.findList({
      companyId: resolvedCompany ?? companyId,
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
      await this.companiesService.assertAgentsCanAddClients(companyId);
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
    const agentName = req.user.fullName ?? req.user.username;
    return this.service.create(
      {
        ...dto,
        companyId,
      },
      distributorId,
      agentName,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Admin approves client request' })
  async approve(@Request() req: { user: User }, @Param('id') id: string) {
    const reviewer = req.user.fullName ?? req.user.username;
    const result = await this.service.approve(id, reviewer, req.user);
    if (result.request.requestType !== ClientRequestType.UPDATE) {
      await this.credentialsService.ensureDefaultCredentials(result.client.id, req.user);
    }
    return result;
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Admin rejects client request' })
  reject(@Request() req: { user: User }, @Param('id') id: string) {
    const reviewer = req.user.fullName ?? req.user.username;
    return this.service.reject(id, reviewer);
  }
}
