import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Bir foydalanuvchi bir vaqtda bir necha qurilmada (agent/manager/client APK,
 * admin veb-panel) bo‘lishi mumkin — har bir qurilma tokeni alohida saqlanadi.
 */
@Entity('user_push_tokens')
@Index(['userId'])
export class UserPushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  token: string;

  /** android | ios | web — ixtiyoriy, faqat diagnostika uchun */
  @Column({ type: 'varchar', length: 16, nullable: true })
  platform: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
