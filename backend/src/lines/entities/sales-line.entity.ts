import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('sales_lines')
@Index(['companyId', 'code'], { unique: true })
export class SalesLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  companyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  agentName: string | null;

  @Column({ type: 'varchar', nullable: true })
  deliveryName: string | null;

  /** Eski maydon — agent kunlari bilan sync (1=Du … 7=Yak) */
  @Column({ type: 'simple-json', nullable: true })
  visitDays: number[] | null;

  /** Agent boradigan kunlar: 1=Dushanba … 7=Yakshanba */
  @Column({ type: 'simple-json', nullable: true })
  agentVisitDays: number[] | null;

  /** Dostavkachi boradigan kunlar: 1=Dushanba … 7=Yakshanba */
  @Column({ type: 'simple-json', nullable: true })
  deliveryVisitDays: number[] | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
