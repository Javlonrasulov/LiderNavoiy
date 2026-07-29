import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Bitta app user (login) → bir nechta orgdagi klient yozuvlari.
 */
@Entity('user_client_memberships')
@Unique(['userId', 'companyId'])
@Index(['userId'])
@Index(['clientId'])
export class UserClientMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'varchar', length: 64 })
  companyId: string;

  @CreateDateColumn()
  createdAt: Date;
}
