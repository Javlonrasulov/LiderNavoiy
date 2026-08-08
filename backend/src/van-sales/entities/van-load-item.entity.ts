import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VanLoad } from './van-load.entity';

@Entity('van_load_items')
@Index(['loadId', 'productId'], { unique: true })
export class VanLoadItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  loadId: string;

  @ManyToOne(() => VanLoad, (load) => load.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'loadId' })
  load: VanLoad;

  @Column('uuid')
  productId: string;

  @Column({ type: 'varchar', length: 64, default: '' })
  productCode: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  productName: string;

  @Column({ type: 'varchar', length: 32, default: 'dona' })
  unit: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  loadedQty: number;

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  soldQty: number;

  /** Haydovchi/admin topshirgan qoldiq */
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  returnedQty: number;

  /** Admin qabul qilgan miqdor (omborga qaytadi) */
  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  acceptedQty: number;
}
