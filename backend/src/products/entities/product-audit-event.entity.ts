import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ProductAuditAction = 'created' | 'updated' | 'deactivated';

export interface ProductFieldChange {
  field: string;
  before: string | null;
  after: string | null;
}

@Entity('product_audit_events')
@Index(['productId', 'createdAt'])
export class ProductAuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  productId: string;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'varchar', length: 160 })
  actorName: string;

  /** UserRole: admin | manager | … */
  @Column({ type: 'varchar', length: 32 })
  actorRole: string;

  @Column({ type: 'varchar', length: 32 })
  action: ProductAuditAction;

  /** Qisqa xulosa: "Narx va brend o‘zgartirildi" */
  @Column({ type: 'text', nullable: true })
  summary: string | null;

  /** Maydonlar bo‘yicha aniq farqlar */
  @Column({ type: 'jsonb', default: [] })
  changes: ProductFieldChange[];

  @Column({ type: 'jsonb', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
