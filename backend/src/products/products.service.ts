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
import { ProductRating } from './entities/product-rating.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../common/enums';
import { ProductsUploadService } from './products-upload.service';

export type ProductSalesStats = {
  soldQuantity: number;
  soldAmount: number;
  orderCount: number;
  avgRating: number | null;
  ratingCount: number;
};

export type ProductWithStats = Product & ProductSalesStats;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    @InjectRepository(ProductRating)
    private readonly ratingRepo: Repository<ProductRating>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly uploadService: ProductsUploadService,
  ) {}

  private async resolveImage(
    imageUrl?: string | null,
  ): Promise<{ url: string | null | undefined; data: string | null | undefined }> {
    if (imageUrl === undefined) return { url: undefined, data: undefined };
    if (!imageUrl) return { url: null, data: null };
    if (imageUrl.startsWith('data:')) {
      const saved = await this.uploadService.saveDataUrl(imageUrl);
      return { url: saved.url, data: saved.base64 };
    }
    const pathMatch = imageUrl.match(/\/uploads\/products\/[^?#]+/);
    const url = pathMatch ? pathMatch[0] : imageUrl.startsWith('/uploads/') ? imageUrl : imageUrl;
    const data = this.uploadService.readBase64FromUrl(url);
    return { url, data: data ?? undefined };
  }

  private applyCompanyFilter(
    qb: ReturnType<Repository<Product>['createQueryBuilder']>,
    companyId?: string | string[] | null,
  ) {
    if (Array.isArray(companyId)) {
      const ids = companyId.map((id) => id?.trim()).filter(Boolean);
      if (ids.length === 1) {
        qb.andWhere('p.companyId = :companyId', { companyId: ids[0] });
      } else if (ids.length > 1) {
        qb.andWhere('p.companyId IN (:...companyIds)', { companyIds: ids });
      }
      return qb;
    }
    if (companyId) {
      qb.andWhere('p.companyId = :companyId', { companyId });
    }
    return qb;
  }

  findAll(category?: string, companyId?: string | string[] | null) {
    const qb = this.repo.createQueryBuilder('p').where('p.isActive = true');
    this.applyCompanyFilter(qb, companyId);
    if (category) qb.andWhere('p.category = :category', { category });
    return qb.orderBy('p.name', 'ASC').getMany();
  }

  findInStock(category?: string, companyId?: string | string[] | null) {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.stockBalance > 0');
    this.applyCompanyFilter(qb, companyId);
    if (category) qb.andWhere('p.category = :category', { category });
    return qb.orderBy('p.name', 'ASC').getMany();
  }

  async findInStockMap(companyId?: string | string[] | null): Promise<Map<string, Product>> {
    const products = await this.findInStock(undefined, companyId);
    return new Map(products.map((p) => [p.id, p]));
  }

  async findActiveMaps(
    companyId?: string | string[] | null,
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

  getCategories(inStockOnly = false, companyId?: string | string[] | null) {
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
    const image = await this.resolveImage(dto.imageUrl);
    const product = this.repo.create({
      companyId,
      code: dto.code,
      name: dto.name,
      category: dto.category ?? null,
      brand: dto.brand ?? null,
      price: dto.price,
      unit: dto.unit,
      stockBalance: dto.stockBalance ?? 0,
      imageUrl: image.url ?? null,
      imageData: image.data ?? null,
      isActive: true,
    });
    return this.repo.save(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.repo
      .createQueryBuilder('p')
      .addSelect('p.imageData')
      .where('p.id = :id', { id })
      .getOne();
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
    const image = await this.resolveImage(dto.imageUrl);
    Object.assign(product, {
      ...dto,
      companyId: nextCompanyId,
      category: dto.category === undefined ? product.category : dto.category,
      brand: dto.brand === undefined ? product.brand : dto.brand,
      imageUrl: image.url === undefined ? product.imageUrl : image.url,
    });
    if (image.data !== undefined) {
      product.imageData = image.data;
    } else if (image.url === null) {
      product.imageData = null;
    }
    return this.repo.save(product);
  }

  async remove(id: string) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    product.isActive = false;
    return this.repo.save(product);
  }

  /** Buyurtmalardan mahsulot bo‘yicha sotuv agregatsiyasi */
  private async aggregateSalesByProduct(
    companyId?: string | string[] | null,
    productIds?: string[],
  ): Promise<Map<string, { soldQuantity: number; soldAmount: number; orderCount: number }>> {
    const params: unknown[] = [OrderStatus.CANCELLED, OrderStatus.DRAFT];
    let filterSql = `o.status NOT IN ($1, $2)`;

    const ids = Array.isArray(companyId)
      ? companyId.map((id) => id?.trim()).filter(Boolean)
      : companyId?.trim()
        ? [companyId.trim()]
        : [];
    if (ids.length === 1) {
      params.push(ids[0]);
      filterSql += ` AND o."companyId" = $${params.length}`;
    } else if (ids.length > 1) {
      params.push(ids);
      filterSql += ` AND o."companyId" = ANY($${params.length}::text[])`;
    }
    if (productIds?.length) {
      params.push(productIds);
      filterSql += ` AND (elem->>'productId') = ANY($${params.length}::text[])`;
    }

    const rows: Array<{
      productId: string;
      soldQuantity: string | number;
      soldAmount: string | number;
      orderCount: string | number;
    }> = await this.orderRepo.query(
      `
      SELECT
        elem->>'productId' AS "productId",
        COALESCE(SUM((elem->>'quantity')::numeric), 0) AS "soldQuantity",
        COALESCE(SUM((elem->>'quantity')::numeric * (elem->>'price')::numeric), 0) AS "soldAmount",
        COUNT(DISTINCT o.id) AS "orderCount"
      FROM orders o
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) AS elem
      WHERE ${filterSql}
        AND elem->>'productId' IS NOT NULL
        AND elem->>'productId' <> ''
        AND elem->>'productId' <> 'null'
      GROUP BY elem->>'productId'
      `,
      params,
    );

    const map = new Map<string, { soldQuantity: number; soldAmount: number; orderCount: number }>();
    for (const row of rows) {
      if (!row.productId) continue;
      map.set(row.productId, {
        soldQuantity: Number(row.soldQuantity) || 0,
        soldAmount: Number(row.soldAmount) || 0,
        orderCount: Number(row.orderCount) || 0,
      });
    }
    return map;
  }

  private async aggregateRatings(
    productIds: string[],
  ): Promise<Map<string, { avgRating: number | null; ratingCount: number }>> {
    const map = new Map<string, { avgRating: number | null; ratingCount: number }>();
    if (!productIds.length) return map;

    const rows = await this.ratingRepo
      .createQueryBuilder('r')
      .select('r.productId', 'productId')
      .addSelect('AVG(r.stars)', 'avgRating')
      .addSelect('COUNT(*)', 'ratingCount')
      .where('r.productId IN (:...ids)', { ids: productIds })
      .groupBy('r.productId')
      .getRawMany<{ productId: string; avgRating: string; ratingCount: string }>();

    for (const row of rows) {
      const count = Number(row.ratingCount) || 0;
      const avg = count > 0 ? Math.round((Number(row.avgRating) || 0) * 10) / 10 : null;
      map.set(row.productId, { avgRating: avg, ratingCount: count });
    }
    return map;
  }

  async findTopSelling(companyId?: string | string[] | null, limit = 30): Promise<ProductWithStats[]> {
    const salesMap = await this.aggregateSalesByProduct(companyId);
    const ranked = [...salesMap.entries()]
      .filter(([, s]) => s.soldQuantity > 0)
      .sort((a, b) => b[1].soldQuantity - a[1].soldQuantity)
      .slice(0, limit);

    if (!ranked.length) return [];

    const ids = ranked.map(([id]) => id);
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.id IN (:...ids)', { ids })
      .andWhere('p.isActive = true');
    this.applyCompanyFilter(qb, companyId);
    const products = await qb.getMany();
    const byId = new Map(products.map((p) => [p.id, p]));
    const ratings = await this.aggregateRatings(ids);

    return ranked
      .map(([id, sales]) => {
        const product = byId.get(id);
        if (!product) return null;
        const rating = ratings.get(id) ?? { avgRating: null, ratingCount: 0 };
        return {
          ...product,
          soldQuantity: sales.soldQuantity,
          soldAmount: sales.soldAmount,
          orderCount: sales.orderCount,
          avgRating: rating.avgRating,
          ratingCount: rating.ratingCount,
        };
      })
      .filter((p): p is ProductWithStats => Boolean(p));
  }

  async getProductStats(id: string, companyId?: string | null): Promise<ProductWithStats> {
    const product = await this.findOne(id);
    if (!product || !product.isActive) throw new NotFoundException('Product not found');
    if (companyId && product.companyId && product.companyId !== companyId) {
      throw new NotFoundException('Product not found');
    }

    const [salesMap, ratings] = await Promise.all([
      this.aggregateSalesByProduct(companyId, [id]),
      this.aggregateRatings([id]),
    ]);
    const sales = salesMap.get(id) ?? { soldQuantity: 0, soldAmount: 0, orderCount: 0 };
    const rating = ratings.get(id) ?? { avgRating: null, ratingCount: 0 };

    return {
      ...product,
      soldQuantity: sales.soldQuantity,
      soldAmount: sales.soldAmount,
      orderCount: sales.orderCount,
      avgRating: rating.avgRating,
      ratingCount: rating.ratingCount,
    };
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
