import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('company_bank_accounts')
@Index(['companyId'])
export class CompanyBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  companyId: string;

  /** Foydalanuvchi ko‘radigan kod (1C «Код») — texnik UUID emas */
  @Column({ type: 'varchar', length: 32, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  /** 20 xonali hisob raqami — matn (yetakchi 0 saqlanadi) */
  @Column({ type: 'varchar', length: 32 })
  accountNumber: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  bankName: string | null;

  /** 5 xonali MFO — matn (masalan 00083) */
  @Column({ type: 'varchar', length: 16, nullable: true })
  mfo: string | null;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
