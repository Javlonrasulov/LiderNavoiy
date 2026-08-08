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
import { AdminGuard } from '../common/guards/admin.guard';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';
import { VanSalesService } from './van-sales.service';
import {
  AcceptVanReturnDto,
  CreateVanLoadDto,
  SubmitVanReturnDto,
  VanSellDto,
} from './dto/van-sales.dto';

@ApiTags('Van Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('van-sales')
export class VanSalesController {
  constructor(private readonly service: VanSalesService) {}

  @Post('loads')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: create van load (draft)' })
  createLoad(@Request() req: { user: User }, @Body() dto: CreateVanLoadDto) {
    return this.service.createLoad(dto, req.user.id);
  }

  @Get('loads')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: list van loads' })
  listLoads(
    @Query('companyId') companyId?: string,
    @Query('distributorId') distributorId?: string,
    @Query('status') status?: string,
    @Query('loadDate') loadDate?: string,
  ) {
    return this.service.listLoads({
      companyId: companyId?.trim() || null,
      distributorId,
      status,
      loadDate,
    });
  }

  @Get('loads/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: get one van load' })
  getLoad(@Param('id') id: string) {
    return this.service.getLoad(id);
  }

  @Post('loads/:id/confirm')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: confirm load — warehouse ↓, van active' })
  confirmLoad(@Param('id') id: string) {
    return this.service.confirmLoad(id);
  }

  @Post('loads/:id/return')
  @ApiOperation({ summary: 'Submit remaining stock return' })
  submitReturn(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: SubmitVanReturnDto,
  ) {
    const isAdmin =
      req.user.role === UserRole.ADMIN || req.user.role === UserRole.MANAGER;
    return this.service.submitReturn(
      id,
      {
        isAdmin,
        distributorId: req.user.distributorProfile?.id,
      },
      dto,
    );
  }

  @Post('loads/:id/accept-return')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: accept return — warehouse ↑, close load' })
  acceptReturn(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: AcceptVanReturnDto,
  ) {
    return this.service.acceptReturn(id, req.user.id, dto);
  }

  @Get('report')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Admin: day report (sales, cash, debt, progress)' })
  report(
    @Query('companyId') companyId?: string,
    @Query('distributorId') distributorId?: string,
    @Query('loadDate') loadDate?: string,
  ) {
    return this.service.dayReport({
      companyId: companyId?.trim() || null,
      distributorId,
      loadDate,
    });
  }

  @Get('my/stock')
  @ApiOperation({ summary: 'Driver: active van stock' })
  myStock(@Request() req: { user: User }) {
    return this.service.myStock(req.user.distributorProfile!.id);
  }

  @Get('my/clients')
  @ApiOperation({ summary: 'Driver: today clients from Liniya visitDays' })
  myClients(@Request() req: { user: User }) {
    return this.service.myClients(req.user.distributorProfile!.id);
  }

  @Post('sell')
  @ApiOperation({ summary: 'Driver: immediate van sale (delivered, skip tarozi)' })
  sell(@Request() req: { user: User }, @Body() dto: VanSellDto) {
    return this.service.sell(req.user.distributorProfile!.id, dto);
  }
}
