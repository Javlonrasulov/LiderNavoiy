import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { Client } from './entities/client.entity';
import { Order } from '../orders/entities/order.entity';
import { DistributorProfile } from '../distributors/entities/distributor-profile.entity';
import {
  ClientReconciliationDto,
  ReconciliationLineDto,
} from './dto/client-reconciliation.dto';

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class ClientReconciliationService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(DistributorProfile)
    private readonly profileRepo: Repository<DistributorProfile>,
  ) {}

  async getStatement(
    clientId: string,
    from: Date,
    to: Date,
    distributorId?: string,
  ): Promise<ClientReconciliationDto> {
    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');
    if (distributorId && client.distributorId !== distributorId) {
      throw new NotFoundException('Client not found');
    }

    const endOfTo = new Date(to);
    endOfTo.setHours(23, 59, 59, 999);

    const ordersBefore = await this.orderRepo.find({
      where: { clientId, createdAt: LessThan(from) },
      order: { createdAt: 'ASC' },
    });

    const ordersInPeriod = await this.orderRepo.find({
      where: { clientId, createdAt: Between(from, endOfTo) },
      order: { createdAt: 'ASC' },
    });

    let companyName: string | undefined;
    if (client.distributorId) {
      const profile = await this.profileRepo.findOne({
        where: { id: client.distributorId },
      });
      companyName = profile?.companyName ?? undefined;
    }

    const openingDebit = ordersBefore.reduce(
      (sum, o) => sum + toNumber(o.totalAmount),
      0,
    );
    const openingBalance = openingDebit;

    const lines: ReconciliationLineDto[] = [];

    lines.push({
      date: fmtDate(from),
      operation: `${fmtDate(from)} ga qoldiq`,
      debit: openingBalance > 0 ? openingBalance : null,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : null,
      expandable: false,
      isSummary: false,
      isOpening: true,
      isClosing: false,
    });

    let periodDebit = 0;
    let periodCredit = 0;

    for (const order of ordersInPeriod) {
      const amount = toNumber(order.totalAmount);
      periodDebit += amount;
      const shortId = order.offlineId?.slice(-4) ?? order.id.slice(0, 8).toUpperCase();
      lines.push({
        date: fmtDate(new Date(order.createdAt)),
        operation: `Buyurtma № ${shortId}`,
        debit: amount,
        credit: null,
        expandable: Array.isArray(order.items) && order.items.length > 0,
        isSummary: false,
        isOpening: false,
        isClosing: false,
        items: (order.items ?? []).map((item) => ({
          productName: item.productName,
          quantity: toNumber(item.quantity),
          price: toNumber(item.price),
          total: toNumber(item.quantity) * toNumber(item.price),
          unit: item.unit,
        })),
      });
    }

    const turnoverDebit = (openingBalance > 0 ? openingBalance : 0) + periodDebit;
    const closingBalance = openingBalance + periodDebit - periodCredit;

    lines.push({
      operation: 'Jami oborot',
      debit: turnoverDebit,
      credit: periodCredit > 0 ? periodCredit : null,
      expandable: false,
      isSummary: true,
      isOpening: false,
      isClosing: false,
    });

    lines.push({
      date: fmtDate(to),
      operation: `${fmtDate(to)} ga qoldiq`,
      debit: closingBalance > 0 ? closingBalance : null,
      credit: closingBalance < 0 ? Math.abs(closingBalance) : null,
      expandable: false,
      isSummary: false,
      isOpening: false,
      isClosing: true,
    });

    return {
      clientId: client.id,
      clientCode: client.code,
      clientName: client.fullName ?? client.name,
      companyName,
      from: fmtDate(from),
      to: fmtDate(to),
      openingBalance,
      closingBalance,
      totalDebit: turnoverDebit,
      totalCredit: periodCredit,
      lines,
    };
  }
}
