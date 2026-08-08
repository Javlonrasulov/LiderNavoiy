import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VanLoad } from './entities/van-load.entity';
import { VanLoadItem } from './entities/van-load-item.entity';
import { Product } from '../products/entities/product.entity';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { OrderPayment } from '../payments/entities/order-payment.entity';
import { PaymentTerminal } from '../terminals/entities/payment-terminal.entity';
import { Client } from '../clients/entities/client.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import { SalesLine } from '../lines/entities/sales-line.entity';
import { Visit } from '../visits/entities/visit.entity';
import { User } from '../auth/entities/user.entity';
import {
  OrderPaymentStatus,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  VanLoadStatus,
  VisitStatus,
} from '../common/enums';
import { PaymentPhotoUploadService } from '../payments/payment-photo-upload.service';
import {
  AcceptVanReturnDto,
  CreateVanLoadDto,
  SubmitVanReturnDto,
  VanSellDto,
} from './dto/van-sales.dto';

function n(v: unknown, fallback = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function todayIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** JS getDay: 0=Sun…6=Sat → 1=Mon…7=Sun */
function weekDayMon1(d = new Date()): number {
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function remainingOnVan(item: VanLoadItem): number {
  return Math.max(0, n(item.loadedQty) - n(item.soldQty) - n(item.returnedQty));
}

@Injectable()
export class VanSalesService {
  constructor(
    @InjectRepository(VanLoad)
    private readonly loadRepo: Repository<VanLoad>,
    @InjectRepository(VanLoadItem)
    private readonly itemRepo: Repository<VanLoadItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
    @InjectRepository(PaymentTerminal)
    private readonly terminalRepo: Repository<PaymentTerminal>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
    @InjectRepository(SalesLine)
    private readonly lineRepo: Repository<SalesLine>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly photoUpload: PaymentPhotoUploadService,
  ) {}

  private async resolvePhotoUrl(dto: {
    photoUrl?: string;
    photoBase64?: string;
  }): Promise<string | null> {
    const existing = dto.photoUrl?.trim();
    if (existing) return existing;
    const b64 = dto.photoBase64?.trim();
    if (!b64) return null;
    const saved = await this.photoUpload.saveFromBase64(b64);
    return saved.url;
  }

  private async assertTerminal(terminalId: string | undefined, distributorId: string) {
    if (!terminalId) throw new BadRequestException('terminalId required');
    const t = await this.terminalRepo.findOne({ where: { id: terminalId } });
    if (!t || !t.isActive) throw new NotFoundException('Terminal not found');
    if (t.assignedDistributorId !== distributorId) {
      throw new ForbiddenException('Terminal not assigned to you');
    }
  }

  private mapLoad(load: VanLoad, extra?: Record<string, unknown>) {
    const items = (load.items || []).map((it) => {
      const remaining = remainingOnVan(it);
      const expectedReturn = Math.max(0, n(it.loadedQty) - n(it.soldQty));
      const returnedOrAccepted = Math.max(n(it.returnedQty), n(it.acceptedQty));
      const shortage =
        load.status === VanLoadStatus.RETURN_PENDING || load.status === VanLoadStatus.CLOSED
          ? Math.max(0, expectedReturn - returnedOrAccepted)
          : 0;
      return {
        id: it.id,
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        unit: it.unit,
        price: n(it.price),
        loadedQty: n(it.loadedQty),
        soldQty: n(it.soldQty),
        returnedQty: n(it.returnedQty),
        acceptedQty: n(it.acceptedQty),
        remainingQty: remaining,
        expectedReturnQty: expectedReturn,
        shortageQty: shortage,
      };
    });
    return {
      id: load.id,
      companyId: load.companyId,
      distributorId: load.distributorId,
      loadDate: load.loadDate,
      status: load.status,
      loadedAt: load.loadedAt,
      returnSubmittedAt: load.returnSubmittedAt,
      closedAt: load.closedAt,
      notes: load.notes,
      expectedCash: n(load.expectedCash),
      submittedCash: load.submittedCash != null ? n(load.submittedCash) : null,
      cashDiff:
        load.submittedCash != null
          ? n(load.submittedCash) - n(load.expectedCash)
          : null,
      items,
      createdAt: load.createdAt,
      updatedAt: load.updatedAt,
      ...extra,
    };
  }

  async createLoad(dto: CreateVanLoadDto, createdById?: string) {
    if (!dto.items?.length) throw new BadRequestException('items required');
    const profile = await this.profileRepo.findOne({
      where: { id: dto.distributorId },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Distributor not found');

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.productRepo.find({ where: { id: In(productIds) } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const qtyByProduct = new Map<string, number>();
    for (const row of dto.items) {
      qtyByProduct.set(row.productId, (qtyByProduct.get(row.productId) ?? 0) + n(row.quantity));
    }

    const items: Partial<VanLoadItem>[] = [];
    for (const [productId, qty] of qtyByProduct) {
      const p = productMap.get(productId);
      if (!p) throw new NotFoundException(`Product not found: ${productId}`);
      if (!(qty > 0)) continue;
      items.push({
        productId,
        productCode: p.code,
        productName: p.name,
        unit: p.unit,
        price: n(p.price),
        loadedQty: qty,
        soldQty: 0,
        returnedQty: 0,
        acceptedQty: 0,
      });
    }
    if (!items.length) throw new BadRequestException('No valid items');

    const load = this.loadRepo.create({
      companyId: dto.companyId?.trim() || profile.companyId || null,
      distributorId: dto.distributorId,
      loadDate: dto.loadDate || todayIsoDate(),
      status: VanLoadStatus.DRAFT,
      notes: dto.notes?.trim() || null,
      createdById: createdById ?? null,
      items: items as VanLoadItem[],
    });
    const saved = await this.loadRepo.save(load);
    return this.mapLoad(saved, {
      distributorName: profile.user?.fullName || profile.user?.username || null,
    });
  }

  async confirmLoad(id: string) {
    const load = await this.loadRepo.findOne({ where: { id }, relations: ['items'] });
    if (!load) throw new NotFoundException('Van load not found');
    if (load.status !== VanLoadStatus.DRAFT) {
      throw new BadRequestException('Only draft loads can be confirmed');
    }

    const queryRunner = this.loadRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const it of load.items || []) {
        const qty = n(it.loadedQty);
        if (!(qty > 0)) continue;
        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(Product)
          .set({ stockBalance: () => '"stockBalance" - :qty' })
          .where('id = :id', { id: it.productId })
          .andWhere('"stockBalance" >= :qty', { qty })
          .execute();
        if (!result.affected) {
          throw new BadRequestException(
            `Not enough warehouse stock for ${it.productName || it.productId}`,
          );
        }
      }
      load.status = VanLoadStatus.LOADED;
      load.loadedAt = new Date();
      const saved = await queryRunner.manager.save(load);
      await queryRunner.commitTransaction();
      return this.mapLoad(saved);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async listLoads(opts: {
    companyId?: string | null;
    distributorId?: string;
    status?: string;
    loadDate?: string;
  }) {
    const qb = this.loadRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.items', 'items')
      .orderBy('l.loadDate', 'DESC')
      .addOrderBy('l.createdAt', 'DESC')
      .take(200);

    if (opts.companyId) {
      qb.andWhere('(l.companyId = :companyId OR l.companyId IS NULL)', {
        companyId: opts.companyId,
      });
    }
    if (opts.distributorId) {
      qb.andWhere('l.distributorId = :distributorId', {
        distributorId: opts.distributorId,
      });
    }
    if (opts.status) {
      qb.andWhere('l.status = :status', { status: opts.status });
    }
    if (opts.loadDate) {
      qb.andWhere('l.loadDate = :loadDate', { loadDate: opts.loadDate });
    }

    const rows = await qb.getMany();
    const distIds = [...new Set(rows.map((r) => r.distributorId))];
    const profiles =
      distIds.length > 0
        ? await this.profileRepo.find({
            where: { id: In(distIds) },
            relations: ['user'],
          })
        : [];
    const nameMap = new Map(
      profiles.map((p) => [
        p.id,
        p.user?.fullName || p.user?.username || p.id.slice(0, 8),
      ]),
    );

    return rows.map((r) =>
      this.mapLoad(r, { distributorName: nameMap.get(r.distributorId) ?? null }),
    );
  }

  async getLoad(id: string) {
    const load = await this.loadRepo.findOne({ where: { id }, relations: ['items'] });
    if (!load) throw new NotFoundException('Van load not found');
    const profile = await this.profileRepo.findOne({
      where: { id: load.distributorId },
      relations: ['user'],
    });
    return this.mapLoad(load, {
      distributorName: profile?.user?.fullName || profile?.user?.username || null,
    });
  }

  private async findActiveLoad(distributorId: string, loadId?: string): Promise<VanLoad> {
    if (loadId) {
      const load = await this.loadRepo.findOne({
        where: { id: loadId },
        relations: ['items'],
      });
      if (!load) throw new NotFoundException('Van load not found');
      if (load.distributorId !== distributorId) {
        throw new ForbiddenException('Not your van load');
      }
      if (load.status !== VanLoadStatus.LOADED && load.status !== VanLoadStatus.RETURN_PENDING) {
        throw new BadRequestException('Van load is not active');
      }
      return load;
    }
    const load = await this.loadRepo.findOne({
      where: {
        distributorId,
        status: VanLoadStatus.LOADED,
      },
      relations: ['items'],
      order: { loadDate: 'DESC', createdAt: 'DESC' },
    });
    if (!load) throw new BadRequestException('No active van load');
    return load;
  }

  async myStock(distributorId: string) {
    const loads = await this.loadRepo.find({
      where: {
        distributorId,
        status: In([VanLoadStatus.LOADED, VanLoadStatus.RETURN_PENDING]),
      },
      relations: ['items'],
      order: { loadDate: 'DESC', createdAt: 'DESC' },
    });
    return loads.map((l) => this.mapLoad(l));
  }

  async myClients(distributorId: string) {
    const profile = await this.profileRepo.findOne({
      where: { id: distributorId },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Distributor not found');

    const day = weekDayMon1();
    const myName = (profile.user?.fullName || profile.user?.username || '').trim().toLowerCase();
    const myLineCode = (profile.lineCode || '').trim();

    const lines = await this.lineRepo.find({
      where: { isActive: true, ...(profile.companyId ? { companyId: profile.companyId } : {}) },
    });

    const matchedCodes = new Set<string>();
    for (const line of lines) {
      const days = Array.isArray(line.deliveryVisitDays) && line.deliveryVisitDays.length
        ? line.deliveryVisitDays.map(Number)
        : Array.isArray(line.visitDays)
          ? line.visitDays.map(Number)
          : [];
      if (days.length > 0 && !days.includes(day)) continue;

      const deliveryName = (line.deliveryName || '').trim().toLowerCase();
      const codeMatch = myLineCode && line.code === myLineCode;
      const nameMatch = myName && deliveryName && deliveryName === myName;
      if (codeMatch || nameMatch) {
        matchedCodes.add(line.code);
      }
    }

    // Fallback: if driver has lineCode but visitDays empty on that line — still include
    if (matchedCodes.size === 0 && myLineCode) {
      matchedCodes.add(myLineCode);
    }

    if (matchedCodes.size === 0) return [];

    const clients = await this.clientRepo
      .createQueryBuilder('c')
      .where('c.lineCode IN (:...codes)', { codes: [...matchedCodes] })
      .andWhere('c.deletedAt IS NULL')
      .orderBy('c.name', 'ASC')
      .getMany();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const soldToday = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.clientId', 'clientId')
      .addSelect('COUNT(*)', 'cnt')
      .addSelect('COALESCE(SUM(o.totalAmount),0)', 'sum')
      .where('o.deliveryDistributorId = :distributorId', { distributorId })
      .andWhere('o.source = :source', { source: OrderSource.VAN })
      .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('o.deliveredAt BETWEEN :from AND :to', {
        from: todayStart,
        to: todayEnd,
      })
      .groupBy('o.clientId')
      .getRawMany<{ clientId: string; cnt: string; sum: string }>();

    const soldMap = new Map(
      soldToday.map((r) => [
        r.clientId,
        { salesCount: Number(r.cnt) || 0, salesTotal: Number(r.sum) || 0 },
      ]),
    );

    const visited = await this.visitRepo
      .createQueryBuilder('v')
      .select('DISTINCT v.clientId', 'clientId')
      .where('v.distributorId = :distributorId', { distributorId })
      .andWhere('v.visitedAt BETWEEN :from AND :to', {
        from: todayStart,
        to: todayEnd,
      })
      .getRawMany<{ clientId: string }>();
    const visitedSet = new Set(visited.map((v) => v.clientId));

    return clients.map((c) => {
      const sale = soldMap.get(c.id);
      const hasSale = !!sale && sale.salesCount > 0;
      const visitedToday = visitedSet.has(c.id) || hasSale;
      let progress: 'pending' | 'visited' | 'sold' | 'skipped' = 'pending';
      if (hasSale) progress = 'sold';
      else if (visitedToday) progress = 'visited';
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        fullName: c.fullName,
        phone: c.phone,
        address: c.address,
        lineCode: c.lineCode,
        latitude: c.latitude,
        longitude: c.longitude,
        balance: n(c.balance),
        category: c.category,
        progress,
        salesCount: sale?.salesCount ?? 0,
        salesTotal: sale?.salesTotal ?? 0,
        visitedToday,
      };
    });
  }

  async sell(distributorId: string, dto: VanSellDto) {
    if (!dto.items?.length) throw new BadRequestException('items required');

    if (dto.offlineId) {
      const existing = await this.orderRepo.findOne({
        where: { offlineId: dto.offlineId, distributorId },
      });
      if (existing) {
        return { order: existing, payment: null, duplicated: true };
      }
    }

    const client = await this.clientRepo.findOne({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const load = await this.findActiveLoad(distributorId, dto.loadId);
    if (load.status === VanLoadStatus.RETURN_PENDING) {
      throw new BadRequestException('Van return already submitted');
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.productRepo.find({ where: { id: In(productIds) } });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const vanItemMap = new Map((load.items || []).map((i) => [i.productId, i]));

    const qtyByProduct = new Map<string, number>();
    const priceByProduct = new Map<string, number>();
    for (const row of dto.items) {
      qtyByProduct.set(row.productId, (qtyByProduct.get(row.productId) ?? 0) + n(row.quantity));
      if (row.price != null) priceByProduct.set(row.productId, n(row.price));
    }

    const orderItems: OrderItem[] = [];
    for (const [productId, qty] of qtyByProduct) {
      const vanItem = vanItemMap.get(productId);
      if (!vanItem) {
        throw new BadRequestException(`Product not on van: ${productId}`);
      }
      if (remainingOnVan(vanItem) + 0.0001 < qty) {
        throw new BadRequestException(
          `Not enough van stock for ${vanItem.productName} (need ${qty}, have ${remainingOnVan(vanItem)})`,
        );
      }
      const product = productMap.get(productId);
      const price =
        priceByProduct.get(productId) ??
        n(vanItem.price) ??
        n(product?.price) ??
        0;
      orderItems.push({
        productId,
        productCode: vanItem.productCode || product?.code || '',
        productName: vanItem.productName || product?.name || '',
        quantity: qty,
        price,
        unit: vanItem.unit || product?.unit || 'dona',
        actualQuantity: qty,
      });
    }

    const totalAmount = orderItems.reduce(
      (sum, it) => sum + n(it.price) * n(it.quantity),
      0,
    );

    if (dto.paymentMethod === PaymentMethod.TERMINAL) {
      await this.assertTerminal(dto.terminalId, distributorId);
    }

    let collectNow =
      dto.amount != null ? n(dto.amount) : totalAmount;
    if (dto.paymentMethod === PaymentMethod.DEFERRED) {
      collectNow = dto.amount != null ? n(dto.amount) : 0;
    }
    if (collectNow < 0) throw new BadRequestException('Invalid amount');
    if (collectNow > totalAmount + 0.01) {
      throw new BadRequestException('Amount exceeds total');
    }

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dto.dueAt && Number.isNaN(dueAt!.getTime())) {
      throw new BadRequestException('Invalid dueAt');
    }

    const stillDue = Math.max(0, totalAmount - collectNow);
    if (stillDue > 0.01 && !dueAt) {
      throw new BadRequestException('dueAt required when balance remains');
    }

    let payStatus: PaymentStatus;
    let orderPayStatus: OrderPaymentStatus;
    if (stillDue <= 0.01) {
      payStatus = PaymentStatus.PAID;
      orderPayStatus = OrderPaymentStatus.PAID;
    } else if (collectNow > 0.01) {
      payStatus = PaymentStatus.PARTIAL;
      orderPayStatus = OrderPaymentStatus.PARTIAL;
    } else {
      payStatus = PaymentStatus.PENDING;
      orderPayStatus = OrderPaymentStatus.UNPAID;
    }

    const photoUrl = await this.resolvePhotoUrl(dto);

    const queryRunner = this.loadRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const [productId, qty] of qtyByProduct) {
        const vanItem = vanItemMap.get(productId)!;
        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(VanLoadItem)
          .set({ soldQty: () => '"soldQty" + :qty' })
          .where('id = :id', { id: vanItem.id })
          .andWhere('"loadedQty" - "soldQty" - "returnedQty" >= :qty', { qty })
          .execute();
        if (!result.affected) {
          throw new BadRequestException(
            `Not enough van stock for ${vanItem.productName}`,
          );
        }
      }

      let visitId = dto.visitId ?? null;
      if (!visitId) {
        const visitRepo = queryRunner.manager.getRepository(Visit);
        const visit = visitRepo.create({
          distributorId,
          clientId: dto.clientId,
          visitedAt: new Date(),
          status: VisitStatus.COMPLETED,
          orderTotal: totalAmount,
          notes: `van_sale:${load.id}`,
          isOfflineCreated: !!dto.offlineId,
        });
        const savedVisit = await visitRepo.save(visit);
        visitId = savedVisit.id;
      }

      const order = queryRunner.manager.create(Order, {
        distributorId,
        clientId: dto.clientId,
        companyId: client.companyId ?? load.companyId,
        deliveryDistributorId: distributorId,
        visitId,
        items: orderItems,
        totalAmount,
        paidAmount: collectNow,
        paymentStatus: orderPayStatus,
        status: OrderStatus.DELIVERED,
        source: OrderSource.VAN,
        deliveredAt: new Date(),
        loadedAt: load.loadedAt ?? new Date(),
        isOfflineCreated: !!dto.offlineId,
        offlineId: dto.offlineId ?? null,
        lastPaymentPhotoUrl: photoUrl,
      });
      const savedOrder = await queryRunner.manager.save(order);

      const payment = queryRunner.manager.create(OrderPayment, {
        orderId: savedOrder.id,
        clientId: dto.clientId,
        collectorDistributorId: distributorId,
        method: dto.paymentMethod,
        terminalId: dto.terminalId ?? null,
        amount: stillDue > 0.01 ? stillDue + collectNow : collectNow,
        paidAmount: collectNow,
        status: payStatus,
        dueAt: stillDue > 0.01 ? dueAt : null,
        photoUrl,
      });
      const savedPayment = await queryRunner.manager.save(payment);

      if (dto.paymentMethod === PaymentMethod.CASH && collectNow > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(VanLoad)
          .set({ expectedCash: () => '"expectedCash" + :amt' })
          .where('id = :id', { id: load.id })
          .setParameters({ amt: collectNow })
          .execute();
      }

      await queryRunner.commitTransaction();
      return { order: savedOrder, payment: savedPayment, duplicated: false };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async submitReturn(
    id: string,
    actor: { distributorId?: string; isAdmin?: boolean },
    dto: SubmitVanReturnDto,
  ) {
    const load = await this.loadRepo.findOne({ where: { id }, relations: ['items'] });
    if (!load) throw new NotFoundException('Van load not found');
    if (load.status !== VanLoadStatus.LOADED) {
      throw new BadRequestException('Only loaded vans can submit return');
    }
    if (!actor.isAdmin && load.distributorId !== actor.distributorId) {
      throw new ForbiddenException('Not your van load');
    }

    const returnMap = new Map(
      (dto.items || []).map((i) => [i.productId, n(i.quantity)]),
    );

    for (const it of load.items || []) {
      const expected = Math.max(0, n(it.loadedQty) - n(it.soldQty));
      const returned =
        returnMap.size > 0 ? (returnMap.get(it.productId) ?? 0) : expected;
      if (returned > expected + 0.001) {
        throw new BadRequestException(
          `Return qty too high for ${it.productName} (max ${expected})`,
        );
      }
      it.returnedQty = returned;
    }

    load.status = VanLoadStatus.RETURN_PENDING;
    load.returnSubmittedAt = new Date();
    if (dto.submittedCash != null) load.submittedCash = n(dto.submittedCash);
    if (dto.notes?.trim()) load.notes = dto.notes.trim();
    const saved = await this.loadRepo.save(load);
    return this.mapLoad(saved);
  }

  async acceptReturn(id: string, closedById: string | undefined, dto: AcceptVanReturnDto) {
    const load = await this.loadRepo.findOne({ where: { id }, relations: ['items'] });
    if (!load) throw new NotFoundException('Van load not found');
    if (
      load.status !== VanLoadStatus.RETURN_PENDING &&
      load.status !== VanLoadStatus.LOADED
    ) {
      throw new BadRequestException('Load cannot be accepted');
    }

    const acceptMap = new Map(
      (dto.items || []).map((i) => [i.productId, n(i.quantity)]),
    );

    const queryRunner = this.loadRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const it of load.items || []) {
        const expected = Math.max(0, n(it.loadedQty) - n(it.soldQty));
        let accepted: number;
        if (acceptMap.size > 0) {
          accepted = acceptMap.get(it.productId) ?? (n(it.returnedQty) || expected);
        } else if (n(it.returnedQty) > 0) {
          accepted = n(it.returnedQty);
        } else {
          accepted = expected;
        }
        if (accepted > expected + 0.001) {
          throw new BadRequestException(
            `Accepted qty too high for ${it.productName}`,
          );
        }
        it.acceptedQty = accepted;
        it.returnedQty = Math.max(n(it.returnedQty), accepted);

        if (accepted > 0) {
          await queryRunner.manager
            .createQueryBuilder()
            .update(Product)
            .set({ stockBalance: () => '"stockBalance" + :qty' })
            .where('id = :id', { id: it.productId })
            .setParameters({ qty: accepted })
            .execute();
        }
        await queryRunner.manager.save(it);
      }

      load.status = VanLoadStatus.CLOSED;
      load.closedAt = new Date();
      load.closedById = closedById ?? null;
      if (dto.submittedCash != null) load.submittedCash = n(dto.submittedCash);
      if (dto.notes?.trim()) load.notes = dto.notes.trim();
      if (!load.returnSubmittedAt) load.returnSubmittedAt = new Date();
      const saved = await queryRunner.manager.save(load);
      await queryRunner.commitTransaction();
      return this.mapLoad(saved);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async dayReport(opts: {
    companyId?: string | null;
    distributorId?: string;
    loadDate?: string;
  }) {
    const loadDate = opts.loadDate || todayIsoDate();
    const loads = await this.listLoads({
      companyId: opts.companyId,
      distributorId: opts.distributorId,
      loadDate,
    });

    const distIds = [...new Set(loads.map((l) => l.distributorId))];
    const dayStart = new Date(`${loadDate}T00:00:00`);
    const dayEnd = new Date(`${loadDate}T23:59:59.999`);

    let orders: Order[] = [];
    if (distIds.length) {
      const qb = this.orderRepo
        .createQueryBuilder('o')
        .where('o.source = :source', { source: OrderSource.VAN })
        .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('o.deliveredAt BETWEEN :from AND :to', {
          from: dayStart,
          to: dayEnd,
        });
      if (opts.distributorId) {
        qb.andWhere('o.deliveryDistributorId = :d', { d: opts.distributorId });
      } else {
        qb.andWhere('o.deliveryDistributorId IN (:...ids)', { ids: distIds });
      }
      if (opts.companyId) {
        qb.andWhere('(o.companyId = :companyId OR o.companyId IS NULL)', {
          companyId: opts.companyId,
        });
      }
      orders = await qb.getMany();
    }

    let cash = 0;
    let terminal = 0;
    let deferred = 0;
    let totalSales = 0;
    let paidTotal = 0;
    for (const o of orders) {
      totalSales += n(o.totalAmount);
      paidTotal += n(o.paidAmount);
    }

    if (orders.length) {
      const payments = await this.paymentRepo.find({
        where: { orderId: In(orders.map((o) => o.id)) },
      });
      for (const p of payments) {
        const amt = n(p.paidAmount);
        if (p.method === PaymentMethod.CASH) cash += amt;
        else if (p.method === PaymentMethod.TERMINAL) terminal += amt;
        else if (p.method === PaymentMethod.DEFERRED) deferred += Math.max(0, n(p.amount) - amt);
      }
      // remaining debt on van orders
      deferred = Math.max(0, totalSales - paidTotal);
    }

    const clientsVisited = new Set(orders.map((o) => o.clientId)).size;

    return {
      loadDate,
      loads,
      summary: {
        loadsCount: loads.length,
        ordersCount: orders.length,
        clientsSold: clientsVisited,
        totalSales,
        paidTotal,
        cash,
        terminal,
        debt: deferred,
        expectedCash: loads.reduce((s, l) => s + n(l.expectedCash), 0),
        submittedCash: loads.reduce(
          (s, l) => s + (l.submittedCash != null ? n(l.submittedCash) : 0),
          0,
        ),
      },
    };
  }
}
