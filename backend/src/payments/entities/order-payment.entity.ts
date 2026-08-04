import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PaymentMethod, PaymentStatus } from '../../common/enums';

@Entity('order_payments')
@Index(['orderId'])
@Index(['status', 'dueAt'])
@Index(['collectorDistributorId'])
export class OrderPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  orderId: string;

  @Column('uuid')
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  collectorDistributorId: string | null;

  @Column({ type: 'varchar', default: PaymentMethod.CASH })
  method: PaymentMethod;

  @Column({ type: 'uuid', nullable: true })
  terminalId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'varchar', default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastRemindedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

  /** Mijoz o‘zi tushirgan xavfsizlik rasmi (dostavkachi photoUrl dan alohida) */
  @Column({ type: 'varchar', nullable: true })
  clientPhotoUrl: string | null;

  @Column({ default: false })
  dayReminderSent: boolean;

  @Column({ default: false })
  hourReminderSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
