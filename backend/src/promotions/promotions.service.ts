import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import {
  CreatePromotionDto,
  PromotionConditionDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import { Promotion, PromotionCondition } from './entities/promotion.entity';

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

  /** Klient / agent APK — faqat aktiv va muddati o‘tmagan aksiyalar */
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

  private async resolveConditions(
    raw: PromotionConditionDto[] | undefined,
    legacyProductId?: string | null,
    legacyBuyQty?: number | null,
  ): Promise<PromotionCondition[]> {
    let list = Array.isArray(raw) ? [...raw] : [];

    // Legacy: bitta productId + buyQuantity
    if (list.length === 0 && legacyProductId && legacyBuyQty != null && legacyBuyQty > 0) {
      list = [{ productId: legacyProductId, buyQuantity: legacyBuyQty }];
    }

    const resolved: PromotionCondition[] = [];
    for (const c of list) {
      if (!c.productId || !(Number(c.buyQuantity) > 0)) {
        throw new BadRequestException('Each condition needs productId and buyQuantity > 0');
      }
      const product = await this.productsService.findOne(c.productId);
      if (!product) throw new NotFoundException(`Product not found: ${c.productId}`);
      resolved.push({
        productId: product.id,
        productName: product.name,
        buyQuantity: Number(c.buyQuantity),
      });
    }
    return resolved;
  }

  private async resolveReward(
    rewardProductId?: string | null,
    rewardQuantity?: number | null,
    rewardPrice?: number | null,
    legacyFreeQty?: number | null,
  ): Promise<{
    rewardProductId: string | null;
    rewardProductName: string | null;
    rewardQuantity: number | null;
    rewardPrice: number;
  }> {
    const qty =
      rewardQuantity != null && rewardQuantity > 0
        ? Number(rewardQuantity)
        : legacyFreeQty != null && legacyFreeQty > 0
          ? Number(legacyFreeQty)
          : null;

    if (!rewardProductId) {
      return {
        rewardProductId: null,
        rewardProductName: null,
        rewardQuantity: qty,
        rewardPrice: rewardPrice != null ? Number(rewardPrice) : 0,
      };
    }

    const product = await this.productsService.findOne(rewardProductId);
    if (!product) throw new NotFoundException('Reward product not found');

    return {
      rewardProductId: product.id,
      rewardProductName: product.name,
      rewardQuantity: qty,
      rewardPrice: rewardPrice != null ? Number(rewardPrice) : 0,
    };
  }

  private syncLegacyFields(
    conditions: PromotionCondition[],
    reward: {
      rewardProductId: string | null;
      rewardProductName: string | null;
      rewardQuantity: number | null;
      rewardPrice: number;
    },
  ) {
    const first = conditions[0];
    return {
      productId: first?.productId ?? null,
      productName: first?.productName ?? null,
      buyQuantity: first?.buyQuantity ?? null,
      freeQuantity: reward.rewardQuantity,
    };
  }

  async create(dto: CreatePromotionDto) {
    const conditions = await this.resolveConditions(
      dto.conditions,
      dto.productId,
      dto.buyQuantity ?? null,
    );

    const reward = await this.resolveReward(
      dto.rewardProductId,
      dto.rewardQuantity ?? null,
      dto.rewardPrice ?? null,
      dto.freeQuantity ?? null,
    );

    if (conditions.length > 0 && !reward.rewardProductId) {
      throw new BadRequestException('rewardProductId required when conditions are set');
    }
    if (conditions.length > 0 && !(reward.rewardQuantity != null && reward.rewardQuantity > 0)) {
      throw new BadRequestException('rewardQuantity required when conditions are set');
    }

    const legacy = this.syncLegacyFields(conditions, reward);

    const promo = this.repo.create({
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() || null,
      discountPercent: dto.discountPercent ?? 0,
      conditions,
      ...legacy,
      rewardProductId: reward.rewardProductId,
      rewardProductName: reward.rewardProductName,
      rewardQuantity: reward.rewardQuantity,
      rewardPrice: reward.rewardPrice,
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

    if (
      dto.conditions !== undefined ||
      dto.productId !== undefined ||
      dto.buyQuantity !== undefined
    ) {
      const conditions = await this.resolveConditions(
        dto.conditions,
        dto.productId !== undefined ? dto.productId : promo.productId,
        dto.buyQuantity !== undefined ? dto.buyQuantity ?? null : Number(promo.buyQuantity) || null,
      );
      promo.conditions = conditions;
      const first = conditions[0];
      promo.productId = first?.productId ?? null;
      promo.productName = first?.productName ?? null;
      promo.buyQuantity = first?.buyQuantity ?? null;
    }

    if (
      dto.rewardProductId !== undefined ||
      dto.rewardQuantity !== undefined ||
      dto.rewardPrice !== undefined ||
      dto.freeQuantity !== undefined
    ) {
      const reward = await this.resolveReward(
        dto.rewardProductId !== undefined ? dto.rewardProductId : promo.rewardProductId,
        dto.rewardQuantity !== undefined ? dto.rewardQuantity : Number(promo.rewardQuantity) || null,
        dto.rewardPrice !== undefined ? dto.rewardPrice : Number(promo.rewardPrice) || 0,
        dto.freeQuantity !== undefined ? dto.freeQuantity : null,
      );
      promo.rewardProductId = reward.rewardProductId;
      promo.rewardProductName = reward.rewardProductName;
      promo.rewardQuantity = reward.rewardQuantity;
      promo.rewardPrice = reward.rewardPrice;
      promo.freeQuantity = reward.rewardQuantity;
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
