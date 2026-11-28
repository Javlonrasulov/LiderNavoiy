import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cash_categories')
@Index(['companyId'])
@Index(['parentId'])
export class CashCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** null = barcha org uchun umumiy shablon; aks holda filial */
  @Column({ type: 'varchar', length: 64, nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** income | expense | both */
  @Column({ type: 'varchar', length: 16, default: 'expense' })
  kind: 'income' | 'expense' | 'both';

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
