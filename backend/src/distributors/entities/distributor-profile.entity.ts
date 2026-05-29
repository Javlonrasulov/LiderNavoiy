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

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  companyId: string | null;

  @Column({ nullable: true })
  companyName: string | null;

  @Column({ nullable: true })
  lineCode: string | null;

  @Column({ nullable: true })
  phone: string | null;

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
