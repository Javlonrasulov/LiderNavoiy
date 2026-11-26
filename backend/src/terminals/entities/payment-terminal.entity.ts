import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('payment_terminals')
@Index(['assignedDistributorId'])
@Index(['companyId'])
export class PaymentTerminal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** Ichki kod (1C «Код») — mavjud qiymatlar shu ma’noda qoladi */
  @Column({ type: 'varchar', nullable: true })
  code: string | null;

  /**
   * Bank/protsessing identifikatori (1C «ИД»).
   * Harf ham bo‘lishi mumkin; `code` dan alohida.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  externalId: string | null;

  /** Terminalga tegishli 23510 hisob raqami (matn) */
  @Column({ type: 'varchar', length: 32, nullable: true })
  account23510: string | null;

  /** Bog‘langan hisob-kitob hisobi (company_bank_accounts) */
  @Column({ type: 'uuid', nullable: true })
  bankAccountId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  assignedDistributorId: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
