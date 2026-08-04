import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../auth/entities/user.entity';
import { ClientGuard } from '../common/guards/client.guard';
import { PaymentPhotoUploadService } from '../payments/payment-photo-upload.service';
import {
  AttachPaymentPhotoDto,
  ClientCreateOrderDto,
  SetProductRatingDto,
} from './dto/client-portal.dto';
import { ClientPortalService } from './client-portal.service';

@ApiTags('Client Portal')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: false })
@UseGuards(JwtAuthGuard, ClientGuard)
@Controller('client-portal')
export class ClientPortalController {
  constructor(
    private readonly service: ClientPortalService,
    private readonly paymentPhotoUpload: PaymentPhotoUploadService,
  ) {}

  private companyId(headers: Record<string, string | undefined>, query?: string): string | null {
    return (
      query?.trim() ||
      headers['x-company-id']?.trim() ||
      headers['X-Company-Id']?.trim() ||
      null
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Current client profile (+ organizations)' })
  me(
    @Request() req: { user: User },
    @Headers() headers: Record<string, string | undefined>,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.getProfile(req.user, this.companyId(headers, companyId));
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Linked organizations for this login' })
  organizations(@Request() req: { user: User }) {
    return this.service.listOrganizations(req.user);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Client dashboard summary' })
  dashboard(
    @Request() req: { user: User },
    @Headers() headers: Record<string, string | undefined>,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.getDashboard(req.user, this.companyId(headers, companyId));
  }

  @Get('orders')
  @ApiOperation({ summary: 'Client order history (scoped by org)' })
  orders(
    @Request() req: { user: User },
    @Headers() headers: Record<string, string | undefined>,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.getOrders(req.user, this.companyId(headers, companyId));
  }

  @Get('orders/:orderId/tracking')
  @ApiOperation({ summary: 'Live order tracking map data for client app' })
  orderTracking(@Request() req: { user: User }, @Param('orderId') orderId: string) {
    return this.service.getOrderTracking(req.user, orderId);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create order from client app (active org)' })
  createOrder(
    @Request() req: { user: User },
    @Body() dto: ClientCreateOrderDto,
    @Headers() headers: Record<string, string | undefined>,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.createOrder(
      req.user,
      { ...dto, clientId: req.user.clientId! },
      this.companyId(headers, companyId),
    );
  }

  @Get('products')
  @ApiOperation({ summary: 'Product catalog for client (scoped by org)' })
  products(
    @Request() req: { user: User },
    @Headers() headers: Record<string, string | undefined>,
    @Query('category') category?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.listProducts(
      req.user,
      category,
      this.companyId(headers, companyId),
    );
  }

  @Get('products/categories')
  @ApiOperation({ summary: 'Product categories for client (scoped by org)' })
  categories(
    @Request() req: { user: User },
    @Headers() headers: Record<string, string | undefined>,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.productCategories(req.user, this.companyId(headers, companyId));
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Purchase analytics for client app' })
  analytics(
    @Request() req: { user: User },
    @Headers() headers: Record<string, string | undefined>,
    @Query('period') period?: 'week' | 'month' | 'year',
    @Query('companyId') companyId?: string,
  ) {
    return this.service.getAnalytics(
      req.user,
      period ?? 'month',
      this.companyId(headers, companyId),
    );
  }

  @Get('debt')
  @ApiOperation({ summary: 'Client debt summary, history and monthly dynamics' })
  debt(
    @Request() req: { user: User },
    @Headers() headers: Record<string, string | undefined>,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getDebt(
      req.user,
      this.companyId(headers, companyId),
      from,
      to,
    );
  }

  @Post('upload-payment-photo')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload payment proof photo (client)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  uploadPaymentPhoto(@UploadedFile() file: Express.Multer.File) {
    return this.paymentPhotoUpload.saveFile(file);
  }

  @Post('payments/photo')
  @ApiOperation({ summary: 'Attach payment proof photo to own payment' })
  attachPaymentPhoto(
    @Request() req: { user: User },
    @Body() dto: AttachPaymentPhotoDto,
    @Headers() headers: Record<string, string | undefined>,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.attachPaymentPhoto(
      req.user,
      dto,
      this.companyId(headers, companyId),
    );
  }

  @Get('promotions')
  @ApiOperation({ summary: 'Active promotions for client app' })
  promotions() {
    return this.service.listPromotions();
  }

  @Get('product-ratings')
  @ApiOperation({ summary: 'Current user product ratings map' })
  productRatings(@Request() req: { user: User }) {
    return this.service.listMyProductRatings(req.user);
  }

  @Get('products/:productId/rating')
  @ApiOperation({ summary: 'Get my rating for a product' })
  getProductRating(
    @Request() req: { user: User },
    @Param('productId') productId: string,
  ) {
    return this.service.getMyProductRating(req.user, productId);
  }

  @Put('products/:productId/rating')
  @ApiOperation({ summary: 'Set my rating for a product (1-5)' })
  setProductRating(
    @Request() req: { user: User },
    @Param('productId') productId: string,
    @Body() dto: SetProductRatingDto,
  ) {
    return this.service.setMyProductRating(req.user, productId, dto.stars);
  }
}
