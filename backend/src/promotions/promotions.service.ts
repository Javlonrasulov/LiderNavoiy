import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import {
  CreatePromotionDto,
  PromotionConditionDto,
  PromotionRewardDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';
import {
  Promotion,
  PromotionCondition,
  PromotionReward,
} from './entities/promotion.entity';

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

  private async resolveConditions(
    raw: PromotionConditionDto[] | undefined,
    legacyProductId?: string | null,
    legacyBuyQty?: number | null,
  ): Promise<PromotionCondition[]> {
    let list = Array.isArray(raw) ? [...raw] : [];

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

  private async resolveRewards(
    raw: PromotionRewardDto[] | undefined,
    legacyProductId?: string | null,
    legacyQty?: number | null,
    legacyPrice?: number | null,
    legacyFreeQty?: number | null,
  ): Promise<PromotionReward[]> {
    let list = Array.isArray(raw) ? [...raw] : [];

    if (
      list.length === 0 &&
      legacyProductId &&
      ((legacyQty != null && legacyQty > 0) || (legacyFreeQty != null && legacyFreeQty > 0))
    ) {
      list = [
        {
          productId: legacyProductId,
          quantity: Number(legacyQty ?? legacyFreeQty),
          price: legacyPrice != null ? Number(legacyPrice) : 0,
        },
      ];
    }

    const resolved: PromotionReward[] = [];
    const seen = new Set<string>();
    for (const r of list) {
      if (!r.productId || !(Number(r.quantity) > 0)) {
        throw new BadRequestException('Each reward needs productId and quantity > 0');
      }
      if (seen.has(r.productId)) {
        throw new BadRequestException('Duplicate reward product');
      }
      seen.add(r.productId);
      const product = await this.productsService.findOne(r.productId);
      if (!product) throw new NotFoundException(`Reward product not found: ${r.productId}`);
      resolved.push({
        productId: product.id,
        productName: product.name,
        quantity: Number(r.quantity),
        price: r.price != null ? Number(r.price) : 0,
      });
    }
    return resolved;
  }

  private syncLegacyFromRewards(rewards: PromotionReward[]) {
    const first = rewards[0];
    return {
      rewardProductId: first?.productId ?? null,
      rewardProductName: first?.productName ?? null,
      rewardQuantity: first?.quantity ?? null,
      rewardPrice: first != null ? first.price : 0,
      freeQuantity: first?.quantity ?? null,
    };
  }

  private syncLegacyConditions(conditions: PromotionCondition[]) {
    const first = conditions[0];
    return {
      productId: first?.productId ?? null,
      productName: first?.productName ?? null,
      buyQuantity: first?.buyQuantity ?? null,
    };
  }

  async create(dto: CreatePromotionDto) {
    const conditions = await this.resolveConditions(
      dto.conditions,
      dto.productId,
      dto.buyQuantity ?? null,
    );

    const rewards = await this.resolveRewards(
      dto.rewards,
      dto.rewardProductId,
      dto.rewardQuantity ?? null,
      dto.rewardPrice ?? null,
      dto.freeQuantity ?? null,
    );

    if (conditions.length > 0 && rewards.length === 0) {
      throw new BadRequestException('At least one reward product required when conditions are set');
    }

    const promo = this.repo.create({
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() || null,
      discountPercent: dto.discountPercent ?? 0,
      conditions,
      rewards,
      ...this.syncLegacyConditions(conditions),
      ...this.syncLegacyFromRewards(rewards),
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
      Object.assign(promo, this.syncLegacyConditions(conditions));
    }

    if (
      dto.rewards !== undefined ||
      dto.rewardProductId !== undefined ||
      dto.rewardQuantity !== undefined ||
      dto.rewardPrice !== undefined ||
      dto.freeQuantity !== undefined
    ) {
      const rewards = await this.resolveRewards(
        dto.rewards,
        dto.rewardProductId !== undefined ? dto.rewardProductId : promo.rewardProductId,
        dto.rewardQuantity !== undefined ? dto.rewardQuantity : Number(promo.rewardQuantity) || null,
        dto.rewardPrice !== undefined ? dto.rewardPrice : Number(promo.rewardPrice) || 0,
        dto.freeQuantity !== undefined ? dto.freeQuantity : null,
      );
      promo.rewards = rewards;
      Object.assign(promo, this.syncLegacyFromRewards(rewards));
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
