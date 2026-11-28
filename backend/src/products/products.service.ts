import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/product-category.dto';
import {
  CreateProductBrandDto,
  UpdateProductBrandDto,
} from './dto/product-brand.dto';
import { Product } from './entities/product.entity';
import { ProductCategory } from './entities/product-category.entity';
import { ProductBrand } from './entities/product-brand.entity';
import { ProductRating } from './entities/product-rating.entity';
import {
  ProductAuditEvent,
  type ProductAuditAction,
  type ProductFieldChange,
} from './entities/product-audit-event.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../common/enums';
import { ProductsUploadService } from './products-upload.service';
import type { User } from '../auth/entities/user.entity';

export type ProductSalesStats = {
  soldQuantity: number;
  soldAmount: number;
  orderCount: number;
  avgRating: number | null;
  ratingCount: number;
};

export type ProductWithStats = Product & ProductSalesStats;

type ProductAuditActor = {
  userId: string | null;
  userName: string;
  userRole: string;
};

const AUDIT_FIELDS = [
  'code',
  'name',
  'category',
  'brand',
  'price',
  'unit',
  'stockBalance',
  'imageUrl',
  'companyId',
  'isActive',
] as const;

type AuditableField = (typeof AUDIT_FIELDS)[number];

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    @InjectRepository(ProductBrand)
    private readonly brandRepo: Repository<ProductBrand>,
    @InjectRepository(ProductRating)
    private readonly ratingRepo: Repository<ProductRating>,
    @InjectRepository(ProductAuditEvent)
    private readonly auditRepo: Repository<ProductAuditEvent>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly uploadService: ProductsUploadService,
  ) {}

  private resolveActor(actor?: User | null): ProductAuditActor {
    return {
      userId: actor?.id ?? null,
      userName:
        actor?.fullName?.trim() ||
        actor?.username?.trim() ||
        'Nomaʼlum',
      userRole: String(actor?.role ?? 'admin'),
    };
  }

  private fmtAuditValue(field: AuditableField, value: unknown): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (field === 'imageUrl') {
      const s = String(value);
      if (s.startsWith('data:')) return '[rasm yuklandi]';
      return s.length > 80 ? `${s.slice(0, 77)}…` : s;
    }
    if (field === 'price' || field === 'stockBalance') {
      const n = Number(value);
      return Number.isFinite(n) ? String(n) : String(value);
    }
    if (field === 'isActive') return value ? 'aktiv' : 'nofaol';
    return String(value);
  }

  private snapshotProduct(p: Product): Record<AuditableField, string | null> {
    const out = {} as Record<AuditableField, string | null>;
    for (const f of AUDIT_FIELDS) {
      out[f] = this.fmtAuditValue(f, (p as unknown as Record<string, unknown>)[f]);
    }
    return out;
  }

  private diffProducts(before: Product, after: Product): ProductFieldChange[] {
    const a = this.snapshotProduct(before);
    const b = this.snapshotProduct(after);
    const changes: ProductFieldChange[] = [];
    for (const f of AUDIT_FIELDS) {
      if (a[f] === b[f]) continue;
      changes.push({ field: f, before: a[f], after: b[f] });
    }
    return changes;
  }

  private summarize(action: ProductAuditAction, changes: ProductFieldChange[]): string {
    if (action === 'created') return 'Mahsulot yaratildi';
    if (action === 'deactivated') return 'Mahsulot o‘chirildi (nofaol)';
    if (changes.length === 0) return 'Saqlash (o‘zgarish yo‘q)';
    const labels: Record<string, string> = {
      code: 'Kod',
      name: 'Nomi',
      category: 'Kategoriya',
      brand: 'Brend',
      price: 'Narx',
      unit: 'Birlik',
      stockBalance: 'Qoldiq',
      imageUrl: 'Rasm',
      companyId: 'Tashkilot',
      isActive: 'Holat',
    };
    const names = changes.map((c) => labels[c.field] ?? c.field);
    if (names.length <= 3) return `${names.join(', ')} o‘zgartirildi`;
    return `${names.slice(0, 3).join(', ')} va yana ${names.length - 3} ta maydon`;
  }

  private async recordAudit(
    productId: string,
    action: ProductAuditAction,
    changes: ProductFieldChange[],
    actor?: User | null,
    meta?: Record<string, unknown> | null,
  ) {
    const who = this.resolveActor(actor);
    await this.auditRepo.save(
      this.auditRepo.create({
        productId,
        actorUserId: who.userId,
        actorName: who.userName,
        actorRole: who.userRole,
        action,
        summary: this.summarize(action, changes),
        changes,
        meta: meta ?? null,
      }),
    );
  }

  findAudit(productId: string, limit = 100) {
    return this.auditRepo.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }

  private static readonly UNDO_WINDOW_MS = 15 * 60 * 1000;

  private parseAuditField(field: string, raw: string | null): unknown {
    if (raw == null) {
      if (field === 'isActive') return false;
      if (field === 'price' || field === 'stockBalance') return 0;
      return null;
    }
    if (field === 'isActive') {
      return raw === 'aktiv' || raw === 'true' || raw === '1';
    }
    if (field === 'price' || field === 'stockBalance') {
      const n = Number(raw);
      return Number.isFinite(n) ? n : 0;
    }
    return raw;
  }

  private async findLatestUndoableEvent(companyId?: string | string[] | null) {
    const since = new Date(Date.now() - ProductsService.UNDO_WINDOW_MS);
    const recent = await this.auditRepo.find({
      where: { createdAt: MoreThanOrEqual(since) },
      order: { createdAt: 'DESC' },
      take: 80,
    });
    if (recent.length === 0) return null;

    const undoneIds = new Set(
      recent
        .map((e) => (e.meta && typeof e.meta.undoOf === 'string' ? e.meta.undoOf : null))
        .filter((id): id is string => !!id),
    );

    const productIds = [...new Set(recent.map((e) => e.productId))];
    const products = productIds.length
      ? await this.repo.find({ where: { id: In(productIds) } })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    // Soft-deleted (isActive=false) ham topilishi kerak — created undo uchun

    const inScope = (p: Product | undefined) => {
      if (!p) return false;
      if (companyId == null || companyId === undefined) return true;
      if (Array.isArray(companyId)) {
        const ids = companyId.map((x) => x?.trim()).filter(Boolean);
        if (ids.length === 0) return false;
        return !!p.companyId && ids.includes(p.companyId);
      }
      if (!companyId) return true;
      return p.companyId === companyId;
    };

    for (const ev of recent) {
      if (undoneIds.has(ev.id)) continue;
      if (ev.meta && ev.meta.isUndo === true) continue;
      const product = byId.get(ev.productId);
      if (!inScope(product)) continue;
      return { event: ev, product: product! };
    }
    return null;
  }

  async getUndoPreview(companyId?: string | string[] | null) {
    const hit = await this.findLatestUndoableEvent(companyId);
    if (!hit) {
      return {
        available: false as const,
        reason: 'no_recent_change' as const,
        windowMinutes: 15,
        message: 'Oxirgi 15 daqiqada hech qanday o‘zgarish bo‘lmagan',
      };
    }
    const { event, product } = hit;
    const ageMs = Date.now() - new Date(event.createdAt).getTime();
    const remainingMs = Math.max(0, ProductsService.UNDO_WINDOW_MS - ageMs);
    return {
      available: true as const,
      windowMinutes: 15,
      remainingMs,
      event: {
        id: event.id,
        productId: event.productId,
        action: event.action,
        summary: event.summary,
        changes: event.changes ?? [],
        actorName: event.actorName,
        actorRole: event.actorRole,
        createdAt: event.createdAt,
      },
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        brand: product.brand,
        category: product.category,
      },
    };
  }

  async undoLastChange(actor?: User | null, companyId?: string | string[] | null) {
    const hit = await this.findLatestUndoableEvent(companyId);
    if (!hit) {
      throw new BadRequestException({
        code: 'NO_RECENT_CHANGE',
        message: 'Oxirgi 15 daqiqada hech qanday o‘zgarish bo‘lmagan',
      });
    }
    const { event, product } = hit;
    const before = this.repo.create({ ...product });

    if (event.action === 'created') {
      product.isActive = false;
    } else if (event.action === 'deactivated') {
      product.isActive = true;
      for (const ch of event.changes ?? []) {
        if (ch.field === 'isActive') continue;
        (product as unknown as Record<string, unknown>)[ch.field] = this.parseAuditField(
          ch.field,
          ch.before,
        );
      }
    } else {
      for (const ch of event.changes ?? []) {
        (product as unknown as Record<string, unknown>)[ch.field] = this.parseAuditField(
          ch.field,
          ch.before,
        );
      }
    }

    const saved = await this.repo.save(product);
    const changes = this.diffProducts(before, saved);
    await this.recordAudit(saved.id, 'updated', changes, actor, {
      isUndo: true,
      undoOf: event.id,
      undoOfAction: event.action,
      undoOfSummary: event.summary,
    });

    // Original eventni belgilab qo‘yamiz — qayta undo qilinmasin
    event.meta = {
      ...(event.meta ?? {}),
      undoneAt: new Date().toISOString(),
      undoneBy: this.resolveActor(actor).userName,
    };
    await this.auditRepo.save(event);

    return {
      ok: true,
      product: saved,
      undoneEventId: event.id,
      changes,
    };
  }

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
      if (ids.length === 0) {
        // Manager org biriktirilmagan — hech narsa
        qb.andWhere('1 = 0');
      } else if (ids.length === 1) {
        qb.andWhere('p.companyId = :companyId', { companyId: ids[0] });
      } else {
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

  async create(dto: CreateProductDto, actor?: User | null) {
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
      costPrice: dto.costPrice ?? 0,
      unit: dto.unit,
      stockBalance: dto.stockBalance ?? 0,
      imageUrl: image.url ?? null,
      imageData: image.data ?? null,
      isActive: true,
    });
    const saved = await this.repo.save(product);
    const snap = this.snapshotProduct(saved);
    const changes: ProductFieldChange[] = AUDIT_FIELDS
      .filter((f) => snap[f] != null)
      .map((f) => ({ field: f, before: null, after: snap[f] }));
    await this.recordAudit(saved.id, 'created', changes, actor);
    return saved;
  }

  async update(id: string, dto: UpdateProductDto, actor?: User | null) {
    const product = await this.repo
      .createQueryBuilder('p')
      .addSelect('p.imageData')
      .where('p.id = :id', { id })
      .getOne();
    if (!product) throw new NotFoundException('Product not found');
    const before = this.repo.create({ ...product });
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
    const saved = await this.repo.save(product);
    const changes = this.diffProducts(before, saved);
    if (changes.length > 0) {
      await this.recordAudit(saved.id, 'updated', changes, actor);
    }
    return saved;
  }

  async remove(id: string, actor?: User | null) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    const before = this.repo.create({ ...product });
    product.isActive = false;
    const saved = await this.repo.save(product);
    const changes = this.diffProducts(before, saved);
    await this.recordAudit(saved.id, 'deactivated', changes, actor);
    return saved;
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

  findAllBrandMeta() {
    return this.brandRepo.find({ order: { name: 'ASC' } });
  }

  async createBrandMeta(dto: CreateProductBrandDto) {
    const exists = await this.brandRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Brand already exists');
    const row = this.brandRepo.create({
      name: dto.name,
      color: dto.color ?? '#6366f1',
      imageUrl: dto.imageUrl ?? null,
    });
    return this.brandRepo.save(row);
  }

  async updateBrandMeta(id: string, dto: UpdateProductBrandDto) {
    const row = await this.brandRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Brand not found');
    if (dto.name && dto.name !== row.name) {
      const exists = await this.brandRepo.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException('Brand name already exists');
    }
    Object.assign(row, {
      ...dto,
      name: dto.name === undefined ? row.name : dto.name,
      color: dto.color === undefined ? row.color : dto.color,
      imageUrl: dto.imageUrl === undefined ? row.imageUrl : dto.imageUrl,
    });
    return this.brandRepo.save(row);
  }

  async removeBrandMeta(id: string) {
    const row = await this.brandRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Brand not found');
    await this.brandRepo.remove(row);
    return { ok: true };
  }
}
