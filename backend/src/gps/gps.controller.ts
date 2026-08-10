import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GpsService } from './gps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  LocationPointDto,
  BatchLocationDto,
  RouteHistoryQueryDto,
  NearbyClientsQueryDto,
} from './dto/gps.dto';
import { User } from '../auth/entities/user.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { assertManagerCompanyAccess } from '../common/company-scope.util';

@ApiTags('GPS Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gps')
export class GpsController {
  constructor(
    private readonly gpsService: GpsService,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
  ) {}

  private async assertDistributorAccess(user: User, distributorId: string) {
    const profile = await this.profileRepo.findOne({ where: { id: distributorId } });
    assertManagerCompanyAccess(user, profile?.companyId);
  }

  @Post('location')
  @ApiOperation({ summary: 'Send single GPS location point' })
  ingestSingle(@Request() req: { user: User }, @Body() dto: LocationPointDto) {
    const distributorId = req.user.distributorProfile?.id;
    return this.gpsService.ingestSingle(distributorId!, dto);
  }

  @Post('location/batch')
  @ApiOperation({ summary: 'Sync offline GPS batch' })
  ingestBatch(@Request() req: { user: User }, @Body() dto: BatchLocationDto) {
    const distributorId = req.user.distributorProfile?.id;
    return this.gpsService.ingestBatch(distributorId!, dto);
  }

  @Get('location/last')
  @ApiOperation({ summary: 'Get last known location' })
  getLast(@Request() req: { user: User }) {
    const distributorId = req.user.distributorProfile?.id;
    return this.gpsService.getLastLocation(distributorId!);
  }

  @Get('route/:distributorId')
  @ApiOperation({ summary: 'Get route history for distributor' })
  async getRoute(
    @Request() req: { user: User },
    @Param('distributorId') distributorId: string,
    @Query() query: RouteHistoryQueryDto,
  ) {
    await this.assertDistributorAccess(req.user, distributorId);
    return this.gpsService.getRouteHistory(distributorId, query);
  }

  @Get('nearby-clients')
  @ApiOperation({ summary: 'Find clients within radius (PostGIS)' })
  nearbyClients(
    @Request() req: { user: User },
    @Query() query: NearbyClientsQueryDto,
  ) {
    return this.gpsService.findNearbyClients(
      query.latitude,
      query.longitude,
      query.radiusMeters ?? 500,
      req.user.distributorProfile?.id,
    );
  }
}
