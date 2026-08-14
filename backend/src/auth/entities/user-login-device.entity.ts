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
import { User } from './user.entity';

@Entity('user_login_devices')
@Index(['userId', 'deviceKey'], { unique: true })
export class UserLoginDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Unique key per physical device (androidId / brand-model-os) */
  @Column({ type: 'varchar', length: 160 })
  deviceKey: string;

  /** Foydalanuvchi qurilmaga bergan nom: "Alisher's Galaxy A54" */
  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', nullable: true })
  model: string | null;

  @Column({ type: 'varchar', nullable: true })
  os: string | null;

  @Column({ type: 'timestamptz' })
  lastLoginAt: Date;

  @CreateDateColumn()
  firstLoginAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
