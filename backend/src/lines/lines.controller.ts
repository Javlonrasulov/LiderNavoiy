import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { LinesService } from './lines.service';
import { CreateLineDto, UpdateLineDto } from './dto/line.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';

function resolveCompanyIds(user: User, queryCompanyId?: string): string[] | undefined {
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

  const profile = user.distributorProfile;
  if (profile) {
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
    if (ids.length) return ids;
  }

  return fromQuery.length ? fromQuery : undefined;
}

@ApiTags('Lines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lines')
export class LinesController {
  constructor(private readonly service: LinesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales lines' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    const companyIds = resolveCompanyIds(req.user, companyId);
    if (req.user.role === UserRole.MANAGER && (!companyIds || companyIds.length === 0)) {
      return [];
    }
    return this.service.findAll(companyIds);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get line by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @SkipThrottle()
  @ApiOperation({ summary: 'Create line' })
  create(@Request() req: { user: User }, @Body() dto: CreateLineDto) {
    const companyId =
      dto.companyId?.trim() ||
      req.user.distributorProfile?.companyId ||
      undefined;
    return this.service.create({ ...dto, companyId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update line' })
  update(@Param('id') id: string, @Body() dto: UpdateLineDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate line' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
