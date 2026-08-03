import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
    @Query('category') category?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.service.findAll(category, companyId?.trim() || null);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List product categories' })
  categories(@Query('companyId') companyId?: string) {
    return this.service.getCategories(false, companyId?.trim() || null);
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
