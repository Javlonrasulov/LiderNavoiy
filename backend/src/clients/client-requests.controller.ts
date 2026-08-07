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
import { ClientRequestType } from './entities/client-request.entity';

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

  @Get()
  @ApiOperation({ summary: 'List pending client requests (admin)' })
  findPending(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    if (req.user.role === UserRole.DISTRIBUTOR) {
      return [];
    }
    return this.service.findPending(companyId);
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
    const companyId =
      dto.companyId ?? req.user.distributorProfile?.companyId ?? undefined;

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
