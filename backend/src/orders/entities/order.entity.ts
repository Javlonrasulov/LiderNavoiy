import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderStatus, OrderSource } from '../../common/enums';

@Entity('orders')
@Index(['distributorId', 'createdAt'])
@Index(['clientId'])
@Index(['distributorId', 'source', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  distributorId: string;

  @Column('uuid')
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  deliveryDistributorId: string | null;

  @Column({ type: 'uuid', nullable: true })
  visitId: string | null;

  @Column({ type: 'varchar', default: OrderStatus.PENDING })
  status: OrderStatus;

  /** agent = vizit/savat; client = klient ilovasidan */
  @Column({ type: 'varchar', default: OrderSource.AGENT })
  source: OrderSource;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

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
}
