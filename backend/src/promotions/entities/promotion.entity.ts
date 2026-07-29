import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true })
  subtitle: string | null;

  /** Chegirma foizi; 0 bo‘lsa faqat matnli aksiya */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  /** Denormalized mahsulot nomi (klientda tez ko‘rsatish uchun) */
  @Column({ type: 'varchar', nullable: true })
  productName: string | null;

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
