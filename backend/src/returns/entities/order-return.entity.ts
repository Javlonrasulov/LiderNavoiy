import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderReturnStatus } from '../../common/enums';

export interface OrderReturnItem {
  productId: string;
  productCode?: string;
  productName: string;
  quantity: number;
  price: number;
  unit?: string;
}

@Entity('order_returns')
@Index(['orderId'])
@Index(['status'])
export class OrderReturn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  orderId: string;

  @Column({ type: 'uuid', nullable: true })
  requestedByDistributorId: string | null;

  @Column({ type: 'varchar', default: OrderReturnStatus.PENDING })
  status: OrderReturnStatus;

  @Column({ type: 'jsonb', default: [] })
  items: OrderReturnItem[];

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
