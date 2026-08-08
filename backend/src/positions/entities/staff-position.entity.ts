import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PositionAppAccess = 'agent' | 'delivery' | 'manager';

@Entity('staff_positions')
@Index(['code'], { unique: true })
export class StaffPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  code: number;

  @Column()
  name: string;

  /** agent | delivery | manager */
  @Column({ type: 'varchar', length: 32, default: 'agent' })
  appAccess: PositionAppAccess;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
