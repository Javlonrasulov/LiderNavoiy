import { Controller, Get, Post, Patch, Put, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto, BatchOrdersDto, UpdateOrderDto, SendToWarehouseDto, UpdateOrderItemsDto, ReorderDeliveryDto } from './dto/order.dto';
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

  @Get('client-pending')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Manager/admin: client orders for all agents (with wait times)' })
  findClientOrdersAdmin(
    @Query('status') status?: OrderStatus,
    @Query('companyId') companyId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findClientOrdersForAdmin({
      status: status || OrderStatus.PENDING,
      companyId: companyId || undefined,
      limit: limit ? Number(limit) : 200,
    });
  }

  @Get('delivery')
  @ApiOperation({ summary: 'List orders assigned to delivery person (Tovar yuklash)' })
  findDeliveryOrders(@Request() req: { user: User }) {
    return this.service.findForDelivery(req.user.distributorProfile!.id);
  }

  @Put('delivery/reorder')
  @ApiOperation({ summary: 'Reorder on_way delivery stops (1…N)' })
  reorderDelivery(
    @Request() req: { user: User },
    @Body() dto: ReorderDeliveryDto,
  ) {
    return this.service.reorderDelivery(
      req.user.distributorProfile!.id,
      dto.orderIds,
    );
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
      return this.service.findByDistributor(
        req.user.distributorProfile!.id,
        from ? new Date(from.includes('T') ? from : `${from}T00:00:00+05:00`) : undefined,
        to ? new Date(to.includes('T') ? to : `${to}T23:59:59.999+05:00`) : undefined,
      );
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

  @Patch(':id/items')
  @ApiOperation({ summary: 'Agent updates pending client order items (qty / add / remove)' })
  updateClientOrderItems(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateOrderItemsDto,
  ) {
    return this.service.updateClientOrderItems(
      id,
      req.user.distributorProfile!.id,
      dto.items,
    );
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
