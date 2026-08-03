import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DistributorProfile } from '../../distributors/entities/distributor-profile.entity';

@Entity('clients')
@Index(['companyId'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  onTradeId: string | null;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  fullName: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  companyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  lineCode: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  /** Oxirgi marta lokatsiya o'zgartirilgan vaqt */
  @Column({ type: 'timestamptz', nullable: true })
  locationUpdatedAt: Date | null;

  /** Lokatsiyani o'zgartirgan foydalanuvchi id */
  @Column({ type: 'uuid', nullable: true })
  locationUpdatedById: string | null;

  /** Lokatsiyani o'zgartirgan foydalanuvchi nomi (ko'rsatish uchun) */
  @Column({ type: 'varchar', nullable: true })
  locationUpdatedByName: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ type: 'uuid', nullable: true })
  distributorId: string | null;

  @ManyToOne(() => DistributorProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'distributorId' })
  distributor: DistributorProfile | null;

  @Column({ type: 'varchar', nullable: true })
  inn: string | null;

  @Column({ type: 'varchar', nullable: true })
  contactPerson: string | null;

  @Column({ type: 'varchar', nullable: true })
  territory: string | null;

  @Column({ type: 'varchar', nullable: true })
  clientClass: string | null;

  @Column({ type: 'varchar', nullable: true })
  priceCategory: string | null;

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
