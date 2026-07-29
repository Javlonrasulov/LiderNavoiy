import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/product-category.dto';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductsUploadService } from './products-upload.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    private readonly uploadService: ProductsUploadService,
  ) {}

  private async resolveImageUrl(imageUrl?: string | null): Promise<string | null | undefined> {
    if (imageUrl === undefined) return undefined;
    if (!imageUrl) return null;
    if (imageUrl.startsWith('data:')) {
      const saved = await this.uploadService.saveDataUrl(imageUrl);
      return saved.url;
    }
    const pathMatch = imageUrl.match(/\/uploads\/products\/[^?#]+/);
    if (pathMatch) return pathMatch[0];
    if (imageUrl.startsWith('/uploads/')) return imageUrl;
    return imageUrl;
  }

  private applyCompanyFilter(
    qb: ReturnType<Repository<Product>['createQueryBuilder']>,
    companyId?: string | null,
  ) {
    if (companyId) {
      qb.andWhere('p.companyId = :companyId', { companyId });
    }
    return qb;
  }

  findAll(category?: string, companyId?: string | null) {
    const qb = this.repo.createQueryBuilder('p').where('p.isActive = true');
    this.applyCompanyFilter(qb, companyId);
    if (category) qb.andWhere('p.category = :category', { category });
    return qb.orderBy('p.name', 'ASC').getMany();
  }

  findInStock(category?: string, companyId?: string | null) {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.stockBalance > 0');
    this.applyCompanyFilter(qb, companyId);
    if (category) qb.andWhere('p.category = :category', { category });
    return qb.orderBy('p.name', 'ASC').getMany();
  }

  async findInStockMap(companyId?: string | null): Promise<Map<string, Product>> {
    const products = await this.findInStock(undefined, companyId);
    return new Map(products.map((p) => [p.id, p]));
  }

  async findActiveMaps(
    companyId?: string | null,
  ): Promise<{ byId: Map<string, Product>; byCode: Map<string, Product> }> {
    const products = await this.findAll(undefined, companyId);
    return {
      byId: new Map(products.map((p) => [p.id, p])),
      byCode: new Map(products.map((p) => [p.code, p])),
    };
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  getCategories(inStockOnly = false, companyId?: string | null) {
    const qb = this.repo
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.category IS NOT NULL')
      .andWhere('p.isActive = true');
    this.applyCompanyFilter(qb, companyId);
    if (inStockOnly) qb.andWhere('p.stockBalance > 0');
    return qb.orderBy('p.category', 'ASC').getRawMany();
  }

  private async assertCodeAvailable(code: string, companyId: string | null, excludeId?: string) {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.code = :code', { code })
      .andWhere('p.isActive = true');
    if (companyId) {
      qb.andWhere('p.companyId = :companyId', { companyId });
    } else {
      qb.andWhere('p.companyId IS NULL');
    }
    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });
    const exists = await qb.getOne();
    if (exists) throw new ConflictException('Product code already exists');
  }

  private async assertNameAvailable(name: string, companyId: string | null, excludeId?: string) {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.name)) = LOWER(TRIM(:name))', { name })
      .andWhere('p.isActive = true');
    if (companyId) {
      qb.andWhere('p.companyId = :companyId', { companyId });
    } else {
      qb.andWhere('p.companyId IS NULL');
    }
    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });
    const sameName = await qb.getOne();
    if (sameName) throw new ConflictException('Product name already exists');
  }

  async create(dto: CreateProductDto) {
    const companyId = dto.companyId?.trim() || null;
    await this.assertCodeAvailable(dto.code, companyId);
    await this.assertNameAvailable(dto.name, companyId);
    const imageUrl = await this.resolveImageUrl(dto.imageUrl);
    const product = this.repo.create({
      companyId,
      code: dto.code,
      name: dto.name,
      category: dto.category ?? null,
      brand: dto.brand ?? null,
      price: dto.price,
      unit: dto.unit,
      stockBalance: dto.stockBalance ?? 0,
      imageUrl: imageUrl ?? null,
      isActive: true,
    });
    return this.repo.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const nextCompanyId =
      dto.companyId !== undefined ? dto.companyId?.trim() || null : product.companyId;
    if (dto.code && dto.code !== product.code) {
      await this.assertCodeAvailable(dto.code, nextCompanyId, id);
    }
    if (dto.name && dto.name !== product.name) {
      await this.assertNameAvailable(dto.name, nextCompanyId, id);
    }
    if (
      dto.companyId !== undefined &&
      nextCompanyId !== product.companyId &&
      !dto.code &&
      !dto.name
    ) {
      await this.assertCodeAvailable(product.code, nextCompanyId, id);
      await this.assertNameAvailable(product.name, nextCompanyId, id);
    }
    const imageUrl = await this.resolveImageUrl(dto.imageUrl);
    Object.assign(product, {
      ...dto,
      companyId: nextCompanyId,
      category: dto.category === undefined ? product.category : dto.category,
      brand: dto.brand === undefined ? product.brand : dto.brand,
      imageUrl: imageUrl === undefined ? product.imageUrl : imageUrl,
    });
    return this.repo.save(product);
  }

  async remove(id: string) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    product.isActive = false;
    return this.repo.save(product);
  }

  findAllCategoryMeta() {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async createCategoryMeta(dto: CreateProductCategoryDto) {
    const exists = await this.categoryRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Category already exists');
    const row = this.categoryRepo.create({
      name: dto.name,
      color: dto.color ?? '#6366f1',
      emoji: dto.emoji ?? '📦',
      imageUrl: dto.imageUrl ?? null,
    });
    return this.categoryRepo.save(row);
  }

  async updateCategoryMeta(id: string, dto: UpdateProductCategoryDto) {
    const row = await this.categoryRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');
    if (dto.name && dto.name !== row.name) {
      const exists = await this.categoryRepo.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException('Category name already exists');
    }
    Object.assign(row, {
      ...dto,
      name: dto.name === undefined ? row.name : dto.name,
      color: dto.color === undefined ? row.color : dto.color,
      emoji: dto.emoji === undefined ? row.emoji : dto.emoji,
      imageUrl: dto.imageUrl === undefined ? row.imageUrl : dto.imageUrl,
    });
    return this.categoryRepo.save(row);
  }

  async removeCategoryMeta(id: string) {
    const row = await this.categoryRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Category not found');
    await this.categoryRepo.remove(row);
    return { ok: true };
  }
}
