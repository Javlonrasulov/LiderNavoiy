import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderPayment } from './entities/order-payment.entity';
import { PaymentTerminal } from '../terminals/entities/payment-terminal.entity';
import { Client } from '../clients/entities/client.entity';
import {
  OrderPaymentStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { CollectPaymentDto, DeliverOrderDto, UpdateDueAtDto } from './dto/payment.dto';
import { NotificationType as NType } from '../notifications/notification.types';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderPayment)
    private readonly paymentRepo: Repository<OrderPayment>,
    @InjectRepository(PaymentTerminal)
    private readonly terminalRepo: Repository<PaymentTerminal>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async deliver(orderId: string, distributorId: string, dto: DeliverOrderDto) {
    const order = await this.requireCourierOrder(orderId, distributorId);
    if (order.status !== OrderStatus.ON_WAY) {
      throw new BadRequestException('Order is not on the way');
    }

    const total = Number(order.totalAmount) - Number(order.returnedAmount || 0);
    const alreadyPaid = Number(order.paidAmount || 0);
    const remaining = Math.max(0, total - alreadyPaid);
    let collectNow = dto.amount != null ? Number(dto.amount) : remaining;
    if (collectNow < 0) throw new BadRequestException('Invalid amount');
    if (collectNow > remaining + 0.01) {
      throw new BadRequestException('Amount exceeds remaining balance');
    }

    if (dto.paymentMethod === PaymentMethod.TERMINAL) {
      await this.assertTerminal(dto.terminalId, distributorId);
    }

    if (dto.paymentMethod === PaymentMethod.DEFERRED) {
      if (!dto.dueAt) throw new BadRequestException('dueAt required for deferred');
      collectNow = dto.amount != null ? Number(dto.amount) : 0;
    } else if (dto.paymentMethod === PaymentMethod.CASH || dto.paymentMethod === PaymentMethod.TERMINAL) {
      if (collectNow <= 0 && remaining > 0 && !dto.dueAt) {
        // full must collect or set due
        collectNow = remaining;
      }
    }

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dto.dueAt && Number.isNaN(dueAt!.getTime())) {
      throw new BadRequestException('Invalid dueAt');
    }

    const newPaid = alreadyPaid + collectNow;
    const stillDue = Math.max(0, total - newPaid);

    let payStatus: PaymentStatus;
    let orderPayStatus: OrderPaymentStatus;
    if (stillDue <= 0.01) {
      payStatus = PaymentStatus.PAID;
      orderPayStatus = OrderPaymentStatus.PAID;
    } else if (newPaid > 0.01) {
      payStatus = PaymentStatus.PARTIAL;
      orderPayStatus = OrderPaymentStatus.PARTIAL;
    } else {
      payStatus = PaymentStatus.PENDING;
      orderPayStatus = OrderPaymentStatus.UNPAID;
    }

    if (stillDue > 0.01 && !dueAt) {
      throw new BadRequestException('dueAt required when balance remains');
    }

    const payment = this.paymentRepo.create({
      orderId: order.id,
      clientId: order.clientId,
      collectorDistributorId: distributorId,
      method: dto.paymentMethod,
      terminalId: dto.terminalId ?? null,
      amount: stillDue > 0.01 ? stillDue + collectNow : collectNow,
      paidAmount: collectNow,
      status: payStatus,
      dueAt: stillDue > 0.01 ? dueAt : null,
      photoUrl: dto.photoUrl ?? null,
    });
    await this.paymentRepo.save(payment);

    order.status = OrderStatus.DELIVERED;
    order.deliverySequence = null;
    order.paidAmount = newPaid;
    order.paymentStatus = orderPayStatus;
    if (dto.photoUrl) order.lastPaymentPhotoUrl = dto.photoUrl;
    await this.orderRepo.save(order);

    await this.notifyPaymentCollected(order, collectNow, stillDue, !!dto.photoUrl);

    return { order, payment };
  }

  async collectMore(orderId: string, distributorId: string, dto: CollectPaymentDto) {
    const order = await this.requireCourierOrder(orderId, distributorId);
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order must be delivered');
    }
    const total = Number(order.totalAmount) - Number(order.returnedAmount || 0);
    const alreadyPaid = Number(order.paidAmount || 0);
    const remaining = Math.max(0, total - alreadyPaid);
    const collectNow = Number(dto.amount);
    if (collectNow <= 0 || collectNow > remaining + 0.01) {
      throw new BadRequestException('Invalid amount');
    }
    if (dto.paymentMethod === PaymentMethod.TERMINAL) {
      await this.assertTerminal(dto.terminalId, distributorId);
    }
    if (dto.paymentMethod === PaymentMethod.DEFERRED) {
      throw new BadRequestException('Use dueAt update for deferring');
    }

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    const newPaid = alreadyPaid + collectNow;
    const stillDue = Math.max(0, total - newPaid);
    if (stillDue > 0.01 && !dueAt) {
      // keep previous due if any
    }

    const payment = this.paymentRepo.create({
      orderId: order.id,
      clientId: order.clientId,
      collectorDistributorId: distributorId,
      method: dto.paymentMethod,
      terminalId: dto.terminalId ?? null,
      amount: collectNow,
      paidAmount: collectNow,
      status: PaymentStatus.PAID,
      dueAt: null,
      photoUrl: dto.photoUrl ?? null,
    });
    await this.paymentRepo.save(payment);

    order.paidAmount = newPaid;
    order.paymentStatus =
      stillDue <= 0.01 ? OrderPaymentStatus.PAID : OrderPaymentStatus.PARTIAL;
    if (dto.photoUrl) order.lastPaymentPhotoUrl = dto.photoUrl;
    await this.orderRepo.save(order);

    if (stillDue > 0.01 && dueAt) {
      await this.paymentRepo.save(
        this.paymentRepo.create({
          orderId: order.id,
          clientId: order.clientId,
          collectorDistributorId: distributorId,
          method: PaymentMethod.DEFERRED,
          amount: stillDue,
          paidAmount: 0,
          status: PaymentStatus.PENDING,
          dueAt,
        }),
      );
    } else if (stillDue <= 0.01) {
      // mark open deferred as paid/cancelled
      const open = await this.paymentRepo.find({
        where: {
          orderId: order.id,
          status: In([PaymentStatus.PENDING, PaymentStatus.PARTIAL]),
        },
      });
      for (const p of open) {
        p.status = PaymentStatus.PAID;
        await this.paymentRepo.save(p);
      }
    }

    await this.notifyPaymentCollected(order, collectNow, stillDue, !!dto.photoUrl);
    return { order, payment };
  }

  async updateDueAt(orderId: string, distributorId: string, dto: UpdateDueAtDto) {
    const order = await this.requireCourierOrder(orderId, distributorId);
    const dueAt = new Date(dto.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('Invalid dueAt');
    }
    let open = await this.paymentRepo.findOne({
      where: {
        orderId,
        status: In([PaymentStatus.PENDING, PaymentStatus.PARTIAL]),
      },
      order: { createdAt: 'DESC' },
    });
    if (!open) {
      const total = Number(order.totalAmount) - Number(order.returnedAmount || 0);
      const remaining = Math.max(0, total - Number(order.paidAmount || 0));
      if (remaining <= 0) throw new BadRequestException('Nothing due');
      open = await this.paymentRepo.save(
        this.paymentRepo.create({
          orderId,
          clientId: order.clientId,
          collectorDistributorId: distributorId,
          method: PaymentMethod.DEFERRED,
          amount: remaining,
          paidAmount: 0,
          status: PaymentStatus.PENDING,
          dueAt,
        }),
      );
    } else {
      open.dueAt = dueAt;
      open.dayReminderSent = false;
      open.hourReminderSent = false;
      open.lastRemindedAt = null;
      await this.paymentRepo.save(open);
    }
    return open;
  }

  async processReminders() {
    const now = new Date();
    const open = await this.paymentRepo.find({
      where: {
        status: In([PaymentStatus.PENDING, PaymentStatus.PARTIAL]),
      },
      take: 200,
    });

    for (const p of open) {
      if (!p.dueAt) continue;
      const due = new Date(p.dueAt);
      const msUntil = due.getTime() - now.getTime();
      const hourMs = 60 * 60 * 1000;

      // Same calendar day reminder (once)
      if (
        !p.dayReminderSent &&
        due.toDateString() === now.toDateString() &&
        msUntil > hourMs
      ) {
        await this.remindBoth(
          p,
          'Bugun to\'lov kuni',
          'Bugun mijoz to\'lov qilishi kerak',
        );
        p.dayReminderSent = true;
        p.lastRemindedAt = now;
        await this.paymentRepo.save(p);
        continue;
      }

      // 1 hour before
      if (!p.hourReminderSent && msUntil > 0 && msUntil <= hourMs) {
        await this.remindBoth(
          p,
          'To\'lov eslatmasi',
          '1 soatdan keyin to\'lov muddati',
        );
        p.hourReminderSent = true;
        p.lastRemindedAt = now;
        await this.paymentRepo.save(p);
        continue;
      }

      // Overdue: klientga (va dostavkachiga) 24 soatda 1 marta
      if (msUntil <= 0) {
        const dayMs = 24 * hourMs;
        const last = p.lastRemindedAt ? new Date(p.lastRemindedAt).getTime() : 0;
        if (now.getTime() - last >= dayMs) {
          await this.remindBoth(
            p,
            'To\'lov muddati o\'tdi',
            'Mijoz hali to\'lov qilmadi — eslatma',
          );
          p.lastRemindedAt = now;
          await this.paymentRepo.save(p);
        }
      }
    }
  }

  private async remindBoth(p: OrderPayment, title: string, body: string) {
    const client = await this.clientRepo.findOne({ where: { id: p.clientId } });
    const name = client?.name ?? 'Mijoz';
    const fullBody = `${name}: ${body}`;
    if (p.collectorDistributorId) {
      await this.notifications.sendToDistributor(
        p.collectorDistributorId,
        title,
        fullBody,
        NType.PAYMENT_REMINDER,
        { orderId: p.orderId, type: 'payment_reminder' },
      );
    }
    await this.notifyClientByClientId(
      p.clientId,
      title,
      fullBody,
      p.orderId,
      NType.PAYMENT_REMINDER,
    );
  }

  private async notifyPaymentCollected(
    order: Order,
    collected: number,
    stillDue: number,
    hasPhoto: boolean,
  ) {
    const amount = Math.round(collected).toLocaleString('uz-UZ');
    let body = `Dostavkachi ${amount} so'm oldi`;
    if (stillDue > 0.01) {
      body += `. Qoldiq: ${Math.round(stillDue).toLocaleString('uz-UZ')} so'm`;
    }
    if (!hasPhoto) {
      body +=
        ". Xavfsizlik: pul bergan insoningizni rasmga tushirib qo'ying";
    }
    await this.notifyClientByClientId(
      order.clientId,
      "To'lov qabul qilindi",
      body,
      order.id,
      NType.PAYMENT,
    );
  }

  private async notifyClientByClientId(
    clientId: string,
    title: string,
    body: string,
    orderId: string,
    type: NType = NType.PAYMENT,
  ) {
    const user = await this.userRepo.findOne({ where: { clientId } });
    if (!user) return;
    await this.notifications.sendToUser(
      user.id,
      title,
      body,
      type,
      { orderId, type: 'payment' },
    );
  }

  private async assertTerminal(terminalId: string | undefined, distributorId: string) {
    if (!terminalId) throw new BadRequestException('terminalId required');
    const t = await this.terminalRepo.findOne({ where: { id: terminalId } });
    if (!t || !t.isActive) throw new NotFoundException('Terminal not found');
    if (t.assignedDistributorId !== distributorId) {
      throw new ForbiddenException('Terminal not assigned to you');
    }
  }

  private async requireCourierOrder(orderId: string, distributorId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryDistributorId !== distributorId) {
      throw new ForbiddenException('Not your delivery order');
    }
    return order;
  }
}
