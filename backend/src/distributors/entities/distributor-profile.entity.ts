import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { DistributorStatus } from '../../common/enums';

@Entity('distributor_profiles')
export class DistributorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.distributorProfile)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'varchar', nullable: true })
  companyId: string | null;

  /** Bir nechta tashkilot: agent ilovasida shu org ma'lumotlari ko‘rinadi */
  @Column({ type: 'simple-json', nullable: true })
  companyIds: string[] | null;

  @Column({ type: 'varchar', nullable: true })
  companyName: string | null;

  @Column({ type: 'varchar', nullable: true })
  lineCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  position: string | null;

  @Column({ type: 'uuid', nullable: true })
  positionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ type: 'enum', enum: DistributorStatus, default: DistributorStatus.OFFLINE })
  status: DistributorStatus;

  @Column({ type: 'double precision', nullable: true })
  lastLatitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  lastLongitude: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLocationAt: Date | null;

  @Column({ default: false })
  isOnline: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
