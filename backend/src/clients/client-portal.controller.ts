import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';
import { ClientGuard } from '../common/guards/client.guard';
import { ClientCreateOrderDto } from './dto/client-portal.dto';
import { ClientPortalService } from './client-portal.service';

@ApiTags('Client Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ClientGuard)
@Controller('client-portal')
export class ClientPortalController {
  constructor(private readonly service: ClientPortalService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current client profile' })
  me(@Request() req: { user: User }) {
    return this.service.getProfile(req.user);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Client dashboard summary' })
  dashboard(@Request() req: { user: User }) {
    return this.service.getDashboard(req.user);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Client order history' })
  orders(@Request() req: { user: User }) {
    return this.service.getOrders(req.user);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create order from client app' })
  createOrder(@Request() req: { user: User }, @Body() dto: ClientCreateOrderDto) {
    return this.service.createOrder(req.user, {
      ...dto,
      clientId: req.user.clientId!,
    });
  }

  @Get('products')
  @ApiOperation({ summary: 'Product catalog for client' })
  products(@Query('category') category?: string) {
    return this.service.listProducts(category);
  }

  @Get('products/categories')
  @ApiOperation({ summary: 'Product categories for client' })
  categories() {
    return this.service.productCategories();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Purchase analytics for client app' })
  analytics(
    @Request() req: { user: User },
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.service.getAnalytics(req.user, period ?? 'month');
  }
}
