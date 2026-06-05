import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DistributorProfile } from '../../distributors/entities/distributor-profile.entity';

export enum ClientRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('client_requests')
@Index(['status'])
@Index(['inn'])
export class ClientRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: ClientRequestStatus.PENDING })
  status: ClientRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  distributorId: string | null;

  @ManyToOne(() => DistributorProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'distributorId' })
  distributor: DistributorProfile | null;

  @Column({ type: 'varchar', nullable: true })
  companyId: string | null;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  fullName: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', nullable: true })
  lineCode: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', nullable: true })
  category: string | null;

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

  @Column({ type: 'varchar', nullable: true })
  agentName: string | null;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'uuid', nullable: true })
  approvedClientId: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
