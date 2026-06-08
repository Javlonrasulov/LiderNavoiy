import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto, BatchOrdersDto, UpdateOrderDto } from './dto/order.dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  create(@Request() req: { user: User }, @Body() dto: CreateOrderDto) {
    return this.service.create(req.user.distributorProfile!.id, dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync offline orders batch' })
  syncBatch(@Request() req: { user: User }, @Body() dto: BatchOrdersDto) {
    return this.service.syncBatch(req.user.distributorProfile!.id, dto.orders);
  }

  @Get()
  @ApiOperation({ summary: 'List orders (admin: all, agent: own)' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    if (req.user.role === UserRole.DISTRIBUTOR) {
      return this.service.findByDistributor(req.user.distributorProfile!.id);
    }
    return this.service.findForAdmin(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update order status / delivery assignment (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, dto);
  }
}
