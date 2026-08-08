import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PlanUnit = 'som' | 'kg' | 'ton' | 'dona';

export interface PlanProductAmount {
  productId: string;
  productName: string;
  amount: number;
}

export interface PlanCategoryAmount {
  key: string;
  name: string;
  amount: number;
  /** Ixtiyoriy: kategoriya ichidagi mahsulot rejalari */
  products?: PlanProductAmount[];
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

  /** Reja birligi: som | kg | ton | dona */
  @Column({ type: 'varchar', length: 16, default: 'som' })
  unit: PlanUnit;

  @Column({ type: 'jsonb', default: [] })
  categories: PlanCategoryAmount[];

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
