import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderStatus, OrderSource, OrderPaymentStatus } from '../../common/enums';

@Entity('orders')
@Index(['distributorId', 'createdAt'])
@Index(['clientId'])
@Index(['distributorId', 'source', 'status'])
@Index(['companyId'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  distributorId: string;

  @Column('uuid')
  clientId: string;

  /** Organizatsiya — multi-org klient uchun */
  @Column({ type: 'varchar', length: 64, nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  deliveryDistributorId: string | null;

  /** Dostavkachi yo‘nalishidagi tartib (1…N). Faqat on_way uchun. */
  @Column({ type: 'int', nullable: true })
  deliverySequence: number | null;

  @Column({ type: 'uuid', nullable: true })
  visitId: string | null;

  @Column({ type: 'varchar', default: OrderStatus.PENDING })
  status: OrderStatus;

  /** agent = vizit/savat; client = klient ilovasidan */
  @Column({ type: 'varchar', default: OrderSource.AGENT })
  source: OrderSource;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  returnedAmount: number;

  @Column({ type: 'varchar', default: OrderPaymentStatus.UNPAID })
  paymentStatus: OrderPaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  lastPaymentPhotoUrl: string | null;

  @Column({ type: 'jsonb', default: [] })
  items: OrderItem[];

  @Column({ default: false })
  isOfflineCreated: boolean;

  /** Agent omborga yuborishda «Shoshilinch» deb belgilagan */
  @Column({ default: false })
  isUrgent: boolean;

  @Column({ type: 'varchar', nullable: true })
  offlineId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  unit: string;

  /** Free (aksiya) bo'lsa true */
  isFree?: boolean;

  /** Promo referensi (ixtiyoriy) */
  promotionId?: string;
}
