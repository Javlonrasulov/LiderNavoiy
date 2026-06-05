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
import { CreateClientRequestDto } from './dto/client-request.dto';

@ApiTags('Client Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('client-requests')
export class ClientRequestsController {
  constructor(private readonly service: ClientRequestsService) {}

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
  @ApiOperation({ summary: 'Agent submits new client for approval' })
  create(@Request() req: { user: User }, @Body() dto: CreateClientRequestDto) {
    const distributorId = req.user.distributorProfile?.id;
    const agentName = req.user.fullName ?? req.user.username;
    return this.service.create(
      {
        ...dto,
        companyId: dto.companyId ?? req.user.distributorProfile?.companyId ?? undefined,
      },
      distributorId,
      agentName,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Admin approves client request' })
  approve(@Request() req: { user: User }, @Param('id') id: string) {
    const reviewer = req.user.fullName ?? req.user.username;
    return this.service.approve(id, reviewer);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Admin rejects client request' })
  reject(@Request() req: { user: User }, @Param('id') id: string) {
    const reviewer = req.user.fullName ?? req.user.username;
    return this.service.reject(id, reviewer);
  }
}
