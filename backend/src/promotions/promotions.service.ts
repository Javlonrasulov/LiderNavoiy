import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { Promotion } from './entities/promotion.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly repo: Repository<Promotion>,
    private readonly productsService: ProductsService,
  ) {}

  findAll() {
    return this.repo.find({ order: { sortOrder: 'ASC', createdAt: 'DESC' } });
  }

  /** Klient APK — faqat aktiv va muddati o‘tmagan aksiyalar */
  findActiveForClient() {
    const now = new Date();
    return this.repo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('(p.validFrom IS NULL OR p.validFrom <= :now)', { now })
      .andWhere('(p.validTo IS NULL OR p.validTo >= :now)', { now })
      .orderBy('p.sortOrder', 'ASC')
      .addOrderBy('p.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string) {
    const promo = await this.repo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  private async resolveProductName(productId?: string | null): Promise<{
    productId: string | null;
    productName: string | null;
  }> {
    if (!productId) return { productId: null, productName: null };
    const product = await this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Product not found');
    return { productId: product.id, productName: product.name };
  }

  async create(dto: CreatePromotionDto) {
    const product = await this.resolveProductName(dto.productId);
    const promo = this.repo.create({
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() || null,
      discountPercent: dto.discountPercent ?? 0,
      productId: product.productId,
      productName: product.productName,
      colorStart: dto.colorStart?.trim() || '#4F46E5',
      colorEnd: dto.colorEnd?.trim() || '#9333EA',
      emoji: dto.emoji?.trim() || '🎁',
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validTo: dto.validTo ? new Date(dto.validTo) : null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(promo);
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const promo = await this.findOne(id);

    if (dto.productId !== undefined) {
      const product = await this.resolveProductName(dto.productId);
      promo.productId = product.productId;
      promo.productName = product.productName;
    }

    if (dto.title !== undefined) promo.title = dto.title.trim();
    if (dto.subtitle !== undefined) promo.subtitle = dto.subtitle?.trim() || null;
    if (dto.discountPercent !== undefined) promo.discountPercent = dto.discountPercent;
    if (dto.colorStart !== undefined) promo.colorStart = dto.colorStart.trim() || promo.colorStart;
    if (dto.colorEnd !== undefined) promo.colorEnd = dto.colorEnd.trim() || promo.colorEnd;
    if (dto.emoji !== undefined) promo.emoji = dto.emoji?.trim() || null;
    if (dto.validFrom !== undefined) {
      promo.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    }
    if (dto.validTo !== undefined) {
      promo.validTo = dto.validTo ? new Date(dto.validTo) : null;
    }
    if (dto.isActive !== undefined) promo.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) promo.sortOrder = dto.sortOrder;

    return this.repo.save(promo);
  }

  async remove(id: string) {
    const promo = await this.findOne(id);
    promo.isActive = false;
    await this.repo.save(promo);
    return { ok: true };
  }
}
