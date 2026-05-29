import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto, BatchOrdersDto } from './dto/order.dto';
import { User } from '../auth/entities/user.entity';

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
  @ApiOperation({ summary: 'Get my orders' })
  findMine(@Request() req: { user: User }) {
    return this.service.findByDistributor(req.user.distributorProfile!.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
