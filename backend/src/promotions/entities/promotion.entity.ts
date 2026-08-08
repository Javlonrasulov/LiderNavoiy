import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Bitta shartli mahsulot: shu miqdordan kam bo‘lmasligi kerak */
export interface PromotionCondition {
  productId: string;
  productName: string;
  buyQuantity: number;
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true })
  subtitle: string | null;

  /** Chegirma foizi; 0 bo‘lsa faqat matnli / buy-get aksiya */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  /**
   * Legacy: bitta mahsulot uchun buy qty.
   * Yangi aksiyalar `conditions` dan foydalanadi; o‘qishda sync qilinadi.
   */
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true })
  buyQuantity: number | null;

  /** Legacy: bepul miqdor — endi `rewardQuantity` */
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true })
  freeQuantity: number | null;

  /** Legacy: birinchi shartli mahsulot */
  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @Column({ type: 'varchar', nullable: true })
  productName: string | null;

  /** Shartli mahsulotlar: har biri uchun minimal buy qty */
  @Column({ type: 'jsonb', default: [] })
  conditions: PromotionCondition[];

  /** Sovg‘a (aksiya) mahsuloti — har doim alohida */
  @Column({ type: 'uuid', nullable: true })
  rewardProductId: string | null;

  @Column({ type: 'varchar', nullable: true })
  rewardProductName: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true })
  rewardQuantity: number | null;

  /** Aksiya narxi; 0 = tekin */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, default: 0 })
  rewardPrice: number | null;

  @Column({ type: 'varchar', default: '#4F46E5' })
  colorStart: string;

  @Column({ type: 'varchar', default: '#9333EA' })
  colorEnd: string;

  @Column({ type: 'varchar', nullable: true })
  emoji: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  validFrom: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  validTo: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
