import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto, BatchOrdersDto, UpdateOrderDto, SendToWarehouseDto } from './dto/order.dto';
import { AdminGuard } from '../common/guards/admin.guard';
import { User } from '../auth/entities/user.entity';
import { UserRole, OrderStatus } from '../common/enums';

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

  @Get('client')
  @ApiOperation({ summary: 'List client-submitted orders for agent (review / warehouse)' })
  findClientOrders(
    @Request() req: { user: User },
    @Query('status') status?: OrderStatus,
  ) {
    return this.service.findClientOrdersForAgent(
      req.user.distributorProfile!.id,
      status,
    );
  }

  @Get('delivery')
  @ApiOperation({ summary: 'List orders assigned to delivery person (Tovar yuklash)' })
  findDeliveryOrders(@Request() req: { user: User }) {
    return this.service.findForDelivery(req.user.distributorProfile!.id);
  }

  @Get()
  @ApiOperation({ summary: 'List orders (admin: all, agent: own)' })
  findAll(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
    @Query('distributorId') distributorId?: string,
    @Query('deliveryDistributorId') deliveryDistributorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    if (req.user.role === UserRole.DISTRIBUTOR) {
      return this.service.findByDistributor(req.user.distributorProfile!.id);
    }
    const take = limit ? Number(limit) : 500;
    const opts = {
      distributorId: distributorId || undefined,
      deliveryDistributorId: deliveryDistributorId || undefined,
      from: from ? new Date(from.includes('T') ? from : `${from}T00:00:00+05:00`) : undefined,
      to: to
        ? new Date(to.includes('T') ? to : `${to}T23:59:59.999+05:00`)
        : undefined,
    };
    return this.service.findForAdmin(companyId, Number.isFinite(take) ? take : 500, opts);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/send-to-warehouse')
  @ApiOperation({ summary: 'Agent confirms client order and sends to warehouse' })
  sendToWarehouse(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: SendToWarehouseDto,
  ) {
    return this.service.sendToWarehouse(
      id,
      req.user.distributorProfile!.id,
      dto?.isUrgent === true,
    );
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Agent rejects a pending client order' })
  rejectClientOrder(@Request() req: { user: User }, @Param('id') id: string) {
    return this.service.rejectClientOrder(id, req.user.distributorProfile!.id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update order status / delivery assignment (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, dto);
  }
}
