import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { VanLoadStatus } from '../../common/enums';
import { VanLoadItem } from './van-load-item.entity';

@Entity('van_loads')
@Index(['companyId', 'loadDate'])
@Index(['distributorId', 'status'])
export class VanLoad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  companyId: string | null;

  @Column('uuid')
  distributorId: string;

  /** YYYY-MM-DD */
  @Column({ type: 'varchar', length: 16 })
  loadDate: string;

  @Column({ type: 'varchar', default: VanLoadStatus.DRAFT })
  status: VanLoadStatus;

  @Column({ type: 'timestamptz', nullable: true })
  loadedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  returnSubmittedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Kassa: kutilgan naqd (van sotuvlardan) */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  expectedCash: number;

  /** Kassa: topshirilgan naqd (admin yozadi) */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  submittedCash: number | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ type: 'uuid', nullable: true })
  closedById: string | null;

  @OneToMany(() => VanLoadItem, (item) => item.load, {
    cascade: true,
    eager: true,
  })
  items: VanLoadItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
