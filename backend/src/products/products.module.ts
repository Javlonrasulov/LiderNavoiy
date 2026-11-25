import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsUploadService } from './products-upload.service';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductBrand } from './entities/product-brand.entity';
import { ProductRating } from './entities/product-rating.entity';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductCategory, ProductBrand, ProductRating, Order])],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsUploadService],
  exports: [ProductsService],
})
export class ProductsModule {}
