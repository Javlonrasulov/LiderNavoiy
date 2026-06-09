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
import { DistributorProfile } from '../../distributors/entities/distributor-profile.entity';
import { Client } from '../../clients/entities/client.entity';
import { UserRole } from '../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.DISTRIBUTOR })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  fcmToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /** Admin panel lavozimi (Operator, Buxgalter, ...) */
  @Column({ type: 'varchar', nullable: true })
  position: string | null;

  /** Admin panel sahifalariga ruxsatlar (Tab id ro'yxati) */
  @Column({ type: 'jsonb', nullable: true })
  permissions: string[] | null;

  @OneToOne(() => DistributorProfile, (profile) => profile.user, { cascade: true, nullable: true })
  distributorProfile?: DistributorProfile;

  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clientId' })
  client?: Client;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
