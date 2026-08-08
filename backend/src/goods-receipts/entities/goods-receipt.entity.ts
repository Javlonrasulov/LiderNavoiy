import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type GoodsReceiptType = 'opt' | 'chakana' | 'ishlab';

export interface GoodsReceiptItem {
  productId?: string | null;
  tovar: string;
  artikul?: string | null;
  kolFakt: number;
  kolBrak: number;
  upakovka?: string | null;
  tsenaPost: number;
  skid?: number;
  tsenaPriv?: number;
  summa: number;
  ves: number;
  unit?: string | null;
}

@Entity('goods_receipts')
@Index(['companyId'])
@Index(['ox'])
@Index(['date'])
export class GoodsReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Brauzer localStorage bilan moslashuv uchun (ixtiyoriy) */
  @Column({ type: 'bigint', nullable: true })
  legacyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  companyId: string | null;

  @Column({ type: 'varchar', length: 64 })
  date: string;

  @Column({ type: 'varchar', length: 32 })
  num: string;

  @Column({ default: true })
  ox: boolean;

  @Column({ type: 'varchar', length: 255, default: '' })
  supplier: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  org: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  warehouse: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  wagon: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  dir: string;

  @Column({ type: 'varchar', length: 128, default: '' })
  invoice: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  sum: number;

  @Column({ type: 'decimal', precision: 18, scale: 3, default: 0 })
  netto: number;

  @Column({ type: 'varchar', length: 32, default: 'opt' })
  type: GoodsReceiptType;

  @Column({ type: 'varchar', length: 255, default: '' })
  author: string;

  @Column({ type: 'uuid', nullable: true })
  authorId: string | null;

  @Column({ type: 'jsonb', default: [] })
  items: GoodsReceiptItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
