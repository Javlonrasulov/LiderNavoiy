import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type ReconciliationStatus = 'draft' | 'done';

export interface FactoryOrderItem {
  productId?: string | null;
  name: string;
  artikul?: string | null;
  orderedQty: number;
  orderedUnit: string;
  orderedPrice: number;
  orderedSum: number;
  /** Solishtirish snapshot */
  receivedQty?: number;
  missingQty?: number;
  missingSum?: number;
}

@Entity('factory_reconciliations')
@Unique(['receiptId'])
@Index(['companyId'])
@Index(['status'])
export class FactoryReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid' })
  receiptId: string;

  @Column({ type: 'uuid', nullable: true })
  managerId: string | null;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status: ReconciliationStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'jsonb', default: [] })
  items: FactoryOrderItem[];

  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 })
  totalOrderedQty: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalOrderedSum: number;

  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 })
  totalReceivedQty: number;

  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 })
  totalMissingQty: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalMissingSum: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
