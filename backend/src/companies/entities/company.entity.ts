import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  shortName: string | null;

  @Column({ type: 'varchar', nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  /** Organizatsiya rasmi — /uploads/companies/... */
  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  /** kg_dona | dona | kg — dona → no Tarozi, show unprepared orders */
  @Column({ type: 'varchar', length: 16, default: 'kg_dona' })
  productType: string;

  /** Ombor / sklad nomi — Tovar yuklash formasida ishlatiladi */
  @Column({ type: 'varchar', nullable: true })
  warehouseName: string | null;

  /** Tashkilot kodi (1C «Код») — bazadagi texnik `id` dan alohida */
  @Column({ type: 'varchar', length: 32, nullable: true })
  orgCode: string | null;

  /** To‘liq yuridik nomi */
  @Column({ type: 'varchar', length: 500, nullable: true })
  fullLegalName: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  legalAddress: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  callCenterPhone: string | null;

  /** STIR / INN */
  @Column({ type: 'varchar', length: 32, nullable: true })
  inn: string | null;

  /** QQS / НДС kodi */
  @Column({ type: 'varchar', length: 64, nullable: true })
  vatCode: string | null;

  /** Rekvizit izohi (description — umumiy tavsif, alohida) */
  @Column({ type: 'text', nullable: true })
  rekvizitNote: string | null;

  /** Naqd pul kassasi nomi */
  @Column({ type: 'varchar', length: 200, nullable: true })
  cashCashboxName: string | null;

  /** Click kassasi nomi */
  @Column({ type: 'varchar', length: 200, nullable: true })
  clickCashboxName: string | null;

  /** Asosiy hisob raqami (company_bank_accounts.id) */
  @Column({ type: 'uuid', nullable: true })
  primaryBankAccountId: string | null;

  /** Agent/dostavkachi mijoz qo‘shishi mumkinmi — default o‘chirilgan */
  @Column({ default: false })
  agentsCanAddClients: boolean;

  /**
   * true — manager/agent mijozni admin tasdigisiz tizimga qo‘shadi
   * false — so‘rov xabarnomaga tushadi, admin tasdiqlagach qo‘shiladi
   */
  @Column({ default: false })
  clientsAddWithoutApproval: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
