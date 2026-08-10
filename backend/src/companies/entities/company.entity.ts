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
