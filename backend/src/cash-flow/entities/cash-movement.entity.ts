import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type CashMovementType = 'income' | 'expense';
export type CashPaymentMethod = 'cash' | 'terminal' | 'bank' | 'other';
export type CashSourceType = 'manual' | 'order_payment' | 'order_return';

@Entity('cash_movements')
@Index(['companyId', 'occurredAt'])
@Index(['type'])
@Index(['categoryId'])
@Index(['sourceType', 'sourceId'])
export class CashMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  companyId: string;

  @Column({ type: 'varchar', length: 16 })
  type: CashMovementType;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  /** Guruh yo‘li matni (masalan: Ofis / Ofisga / Isuzu) — ierarxiya qidiruvi uchun */
  @Column({ type: 'varchar', length: 512, nullable: true })
  categoryPath: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 16, default: 'cash' })
  method: CashPaymentMethod;

  @Column({ type: 'varchar', length: 128, nullable: true })
  cashbox: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  counterparty: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'varchar', length: 32, default: 'manual' })
  sourceType: CashSourceType;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  createdByName: string | null;

  @Column({ default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
