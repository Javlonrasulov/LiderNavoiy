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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductsUploadService } from './products-upload.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/product-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { RequirePage } from '../common/guards/permissions.guard';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../common/enums';

function resolveAgentCompanyScope(
  user: User,
  queryCompanyId?: string,
): string | string[] | null {
  const q = queryCompanyId?.trim();
  if (q) return q;

  const isAgent = user.role === UserRole.DISTRIBUTOR;
  if (!isAgent || !user.distributorProfile) return null;

  const profile = user.distributorProfile;
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
  if (ids.length === 0) return null;
  return ids.length === 1 ? ids[0] : ids;
}

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    private readonly uploadService: ProductsUploadService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List products' })
  findAll(
    @Request() req: { user: User },
    @Query('category') category?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.findAll(
      category,
      resolveAgentCompanyScope(req.user, companyId),
    );
  }

  @Get('top')
  @ApiOperation({ summary: 'Top selling products with ratings' })
  topProducts(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
    @Query('limit') limit?: string,
  ) {
    const n = Math.min(Math.max(parseInt(limit || '30', 10) || 30, 1), 100);
    return this.service.findTopSelling(
      resolveAgentCompanyScope(req.user, companyId),
      n,
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'List product categories' })
  categories(
    @Request() req: { user: User },
    @Query('companyId') companyId?: string,
  ) {
    return this.service.getCategories(
      false,
      resolveAgentCompanyScope(req.user, companyId),
    );
  }

  @Get('category-meta')
  @ApiOperation({ summary: 'List admin product category metadata' })
  categoryMeta() {
    return this.service.findAllCategoryMeta();
  }

  @Post('category-meta')
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Create product category metadata' })
  createCategoryMeta(@Body() dto: CreateProductCategoryDto) {
    return this.service.createCategoryMeta(dto);
  }

  @Patch('category-meta/:metaId')
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Update product category metadata' })
  updateCategoryMeta(
    @Param('metaId') metaId: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.service.updateCategoryMeta(metaId, dto);
  }

  @Delete('category-meta/:metaId')
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Delete product category metadata' })
  removeCategoryMeta(@Param('metaId') metaId: string) {
    return this.service.removeCategoryMeta(metaId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Product detail with sales stats and rating' })
  productStats(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Query('companyId') companyId?: string,
  ) {
    const scope = resolveAgentCompanyScope(req.user, companyId);
    const single =
      typeof scope === 'string' ? scope : Array.isArray(scope) ? scope[0] : null;
    return this.service.getProductStats(id, single);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('upload-image')
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Upload product image' })
  uploadImage(@Body() body: { dataUrl: string }) {
    return this.uploadService.saveDataUrl(body.dataUrl);
  }

  @Post()
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Create product' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Update product' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Deactivate product' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
