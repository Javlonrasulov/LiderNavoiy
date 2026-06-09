import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface PlanCategoryAmount {
  key: string;
  name: string;
  amount: number;
}

@Entity('agent_plans')
@Index(['distributorId', 'year', 'month'], { unique: true })
export class AgentPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  distributorId: string;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'jsonb', default: [] })
  categories: PlanCategoryAmount[];

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
