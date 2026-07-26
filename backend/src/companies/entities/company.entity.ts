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

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  /** kg_dona | dona | kg — dona → no Tarozi, show unprepared orders */
  @Column({ type: 'varchar', length: 16, default: 'kg_dona' })
  productType: string;

  /** Ombor / sklad nomi — Tovar yuklash formasida ishlatiladi */
  @Column({ type: 'varchar', nullable: true })
  warehouseName: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
