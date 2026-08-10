import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import {
  assertManagerCompanyAccess,
  resolveCompanyScope,
  resolveWritableCompanyId,
} from '../common/company-scope.util';

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
      resolveCompanyScope(req.user, companyId),
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
      resolveCompanyScope(req.user, companyId),
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
      resolveCompanyScope(req.user, companyId),
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
  async productStats(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Query('companyId') companyId?: string,
  ) {
    const product = await this.service.findOne(id);
    if (!product) throw new NotFoundException('Product not found');
    assertManagerCompanyAccess(req.user, product.companyId);
    const scope = resolveCompanyScope(req.user, companyId);
    const single =
      typeof scope === 'string' ? scope : Array.isArray(scope) ? scope[0] : null;
    return this.service.getProductStats(id, single);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Request() req: { user: User }, @Param('id') id: string) {
    const product = await this.service.findOne(id);
    if (!product) throw new NotFoundException('Product not found');
    assertManagerCompanyAccess(req.user, product.companyId);
    return product;
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
  create(@Request() req: { user: User }, @Body() dto: CreateProductDto) {
    const companyId = resolveWritableCompanyId(req.user, dto.companyId);
    return this.service.create({ ...dto, companyId });
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const existing = await this.service.findOne(id);
    if (!existing) throw new NotFoundException('Product not found');
    assertManagerCompanyAccess(req.user, existing.companyId);
    const nextDto =
      dto.companyId !== undefined
        ? { ...dto, companyId: resolveWritableCompanyId(req.user, dto.companyId) }
        : dto;
    return this.service.update(id, nextDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @RequirePage('products')
  @ApiOperation({ summary: 'Deactivate product' })
  async remove(@Request() req: { user: User }, @Param('id') id: string) {
    const existing = await this.service.findOne(id);
    if (!existing) throw new NotFoundException('Product not found');
    assertManagerCompanyAccess(req.user, existing.companyId);
    return this.service.remove(id);
  }
}
