import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { OrderItem } from './order.entity';

export type OrderAuditAction =
  | 'client_submitted'
  | 'items_updated'
  | 'sent_to_warehouse'
  | 'rejected';

export interface OrderItemChange {
  productId: string;
  productCode?: string;
  productName: string;
  change: 'added' | 'removed' | 'qty_changed';
  beforeQty?: number;
  afterQty?: number;
  beforePrice?: number;
  afterPrice?: number;
}

@Entity('order_audit_events')
@Index(['orderId', 'createdAt'])
export class OrderAuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  orderId: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'varchar', length: 160 })
  actorName: string;

  /** UserRole: admin | manager | distributor | client */
  @Column({ type: 'varchar', length: 32 })
  actorRole: string;

  @Column({ type: 'varchar', length: 40 })
  action: OrderAuditAction;

  /** Qisqa rasmiy matn: "Agent Javlon tomonidan ko‘rib chiqilmagan. Manager Ismoil buyurtmani o‘zgartirdi" */
  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'jsonb', nullable: true })
  beforeItems: OrderItem[] | null;

  @Column({ type: 'jsonb', nullable: true })
  afterItems: OrderItem[] | null;

  @Column({ type: 'jsonb', default: [] })
  itemChanges: OrderItemChange[];

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
