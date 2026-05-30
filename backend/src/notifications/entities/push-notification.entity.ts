import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType } from '../notification.types';

@Entity('push_notifications')
@Index(['userId', 'createdAt'])
export class PushNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.GENERAL })
  type: NotificationType;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, string> | null;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isSent: boolean;

  @Column({ type: 'varchar', nullable: true })
  fcmMessageId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
