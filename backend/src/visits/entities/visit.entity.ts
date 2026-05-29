import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { VisitStatus } from '../../common/enums';

@Entity('visits')
@Index(['distributorId', 'visitedAt'])
@Index(['clientId'])
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  distributorId: string;

  @Column('uuid')
  clientId: string;

  @Column({ type: 'enum', enum: VisitStatus, default: VisitStatus.COMPLETED })
  status: VisitStatus;

  @Column({ type: 'timestamptz' })
  visitedAt: Date;

  @Column({ type: 'double precision', nullable: true })
  checkInLatitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  checkInLongitude: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  orderTotal: number;

  @Column({ default: false })
  isOfflineCreated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
